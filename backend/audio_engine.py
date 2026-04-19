"""Audio processing engine: applies mastering presets via ffmpeg subprocess."""
import os
import subprocess
import tempfile
import logging

logger = logging.getLogger(__name__)


def apply_preset(input_bytes: bytes, input_ext: str, filter_chain: str, output_ext: str = "wav") -> bytes:
    """Apply ffmpeg filter chain to audio bytes and return processed bytes."""
    with tempfile.NamedTemporaryFile(suffix=f".{input_ext}", delete=False) as fin:
        fin.write(input_bytes)
        input_path = fin.name
    output_path = input_path + f".out.{output_ext}"
    try:
        cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-af", filter_chain,
            "-ar", "44100",
            output_path,
        ]
        result = subprocess.run(cmd, capture_output=True, timeout=300)
        if result.returncode != 0:
            err = result.stderr.decode("utf-8", errors="ignore")[-500:]
            logger.error(f"ffmpeg failed: {err}")
            raise RuntimeError(f"Audio processing failed: {err}")
        with open(output_path, "rb") as f:
            return f.read()
    finally:
        for p in (input_path, output_path):
            try:
                os.unlink(p)
            except OSError:
                pass


def probe_duration(input_bytes: bytes, input_ext: str) -> float:
    """Return duration in seconds using ffprobe."""
    with tempfile.NamedTemporaryFile(suffix=f".{input_ext}", delete=False) as fin:
        fin.write(input_bytes)
        path = fin.name
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", path],
            capture_output=True, timeout=60,
        )
        if result.returncode == 0:
            try:
                return float(result.stdout.decode().strip())
            except ValueError:
                return 0.0
        return 0.0
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


def compute_auto_gain(input_bytes: bytes, input_ext: str, target_peak_db: float = -1.0) -> float:
    """
    Analyses the source and returns the dB adjustment needed to bring its max peak to target_peak_db.
    Positive = boost, negative = attenuate. Uses ffmpeg's `volumedetect` filter.
    Returns 0.0 if analysis fails.
    """
    with tempfile.NamedTemporaryFile(suffix=f".{input_ext}", delete=False) as fin:
        fin.write(input_bytes)
        in_path = fin.name
    try:
        # volumedetect writes stats to stderr; route to /dev/null for output
        result = subprocess.run(
            ["ffmpeg", "-i", in_path, "-af", "volumedetect", "-f", "null", "-"],
            capture_output=True, timeout=120,
        )
        stderr = result.stderr.decode("utf-8", errors="ignore")
        max_volume = None
        for line in stderr.splitlines():
            if "max_volume:" in line:
                # e.g. "[Parsed_volumedetect_0 @ ...] max_volume: -3.9 dB"
                try:
                    max_volume = float(line.split("max_volume:", 1)[1].strip().split()[0])
                    break
                except (ValueError, IndexError):
                    pass
        if max_volume is None:
            return 0.0
        # Auto-gain = how many dB we need to add so the peak lands at target_peak_db.
        # Example: max_volume = -3.9 dB, target = -1.0 dB  → auto-gain = +2.9 dB
        # We want the applied gain to NORMALIZE towards target without clipping.
        # Clamp to the backend's slider range [-12, +12].
        adjustment = target_peak_db - max_volume
        adjustment = max(-12.0, min(12.0, round(adjustment, 1)))
        return adjustment
    except Exception as e:
        logger.warning(f"auto gain analysis failed: {e}")
        return 0.0
    finally:
        try:
            os.unlink(in_path)
        except OSError:
            pass

def measure_loudness(input_bytes: bytes, input_ext: str) -> dict:
    """
    Measure integrated LUFS, true-peak (dBTP), and loudness range (LRA) using
    ffmpeg's EBU R128 analyser. Returns a dict with floats or None on failure.

    Keys: {"integrated_lufs", "true_peak_db", "lra", "threshold_lufs"}
    """
    with tempfile.NamedTemporaryFile(suffix=f".{input_ext}", delete=False) as fin:
        fin.write(input_bytes)
        in_path = fin.name
    try:
        # ebur128 prints a summary block to stderr when the file ends.
        result = subprocess.run(
            ["ffmpeg", "-nostats", "-hide_banner",
             "-i", in_path, "-af", "ebur128=peak=true", "-f", "null", "-"],
            capture_output=True, timeout=180,
        )
        stderr = result.stderr.decode("utf-8", errors="ignore")
        # Parse the "Summary:" block. Example lines:
        #   Integrated loudness:
        #     I:         -13.9 LUFS
        #     Threshold: -24.0 LUFS
        #   Loudness range:
        #     LRA:         6.4 LU
        #   True peak:
        #     Peak:       -1.1 dBFS
        def _grab(token: str):
            for line in stderr.splitlines():
                s = line.strip()
                if s.startswith(token):
                    try:
                        # token "I:" -> "I:         -13.9 LUFS"
                        rest = s.split(token, 1)[1].strip()
                        return float(rest.split()[0])
                    except (ValueError, IndexError):
                        return None
            return None

        data = {
            "integrated_lufs": _grab("I:"),
            "threshold_lufs": _grab("Threshold:"),
            "lra": _grab("LRA:"),
            "true_peak_db": _grab("Peak:"),
        }
        return data
    except Exception as e:
        logger.warning(f"loudness measurement failed: {e}")
        return {"integrated_lufs": None, "threshold_lufs": None, "lra": None, "true_peak_db": None}
    finally:
        try:
            os.unlink(in_path)
        except OSError:
            pass


def waveform_peaks(input_bytes: bytes, input_ext: str, num_points: int = 120) -> list:
    """Extract simple peak data for waveform visualization."""
    with tempfile.NamedTemporaryFile(suffix=f".{input_ext}", delete=False) as fin:
        fin.write(input_bytes)
        in_path = fin.name
    raw_path = in_path + ".raw"
    try:
        # Convert to 8kHz mono PCM s16le for fast peak extraction
        subprocess.run(
            ["ffmpeg", "-y", "-i", in_path, "-ac", "1", "-ar", "8000",
             "-f", "s16le", raw_path],
            capture_output=True, timeout=120,
        )
        import struct
        with open(raw_path, "rb") as f:
            data = f.read()
        samples = struct.unpack(f"<{len(data)//2}h", data)
        if not samples:
            return [0.0] * num_points
        chunk_size = max(1, len(samples) // num_points)
        peaks = []
        for i in range(num_points):
            start = i * chunk_size
            end = min(start + chunk_size, len(samples))
            if start >= end:
                peaks.append(0.0)
                continue
            chunk = samples[start:end]
            peak = max(abs(s) for s in chunk) / 32768.0
            peaks.append(round(peak, 3))
        return peaks
    except Exception as e:
        logger.warning(f"waveform extraction failed: {e}")
        return [0.0] * num_points
    finally:
        for p in (in_path, raw_path):
            try:
                os.unlink(p)
            except OSError:
                pass
