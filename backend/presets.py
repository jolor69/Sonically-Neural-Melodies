"""Audio mastering presets with ffmpeg filter chains."""

PRESETS = [
    {
        "id": "universal",
        "name": "Universal",
        "color": "#3B82F6",
        "icon": "Globe",
        "genres": ["Rock", "Pop", "Electronic", "Alternative"],
        "description": "Natural dynamic and tonal balancing.",
        "lufs": -14,
        "targets": ["streaming", "youtube"],
        # Gentle EQ lift + moderate compression + -14 LUFS target
        "filter": (
            "equalizer=f=80:t=q:w=1:g=1.5,"
            "equalizer=f=3000:t=q:w=1.2:g=1.2,"
            "equalizer=f=10000:t=q:w=1:g=1.5,"
            "acompressor=threshold=-18dB:ratio=3:attack=20:release=250:makeup=2,"
            "loudnorm=I=-14:TP=-1:LRA=9"
        ),
    },
    {
        "id": "fire",
        "name": "Fire",
        "color": "#EF4444",
        "icon": "Flame",
        "genres": ["Trap", "Experimental", "Reggaeton"],
        "description": "Punchy lows and midrange clarity.",
        "lufs": -9,
        "targets": ["mastering"],
        "filter": (
            "equalizer=f=60:t=q:w=1.1:g=3.5,"
            "equalizer=f=200:t=q:w=1:g=-1.5,"
            "equalizer=f=2500:t=q:w=1:g=2,"
            "acompressor=threshold=-16dB:ratio=4:attack=8:release=180:makeup=3,"
            "loudnorm=I=-9:TP=-1:LRA=7"
        ),
    },
    {
        "id": "clarity",
        "name": "Clarity",
        "color": "#06B6D4",
        "icon": "Sparkles",
        "genres": ["Classical", "R&B", "Singer-songwriter"],
        "description": "Pristine highs with light dynamic expansion.",
        "lufs": -16,
        "targets": ["apple_music"],
        "filter": (
            "equalizer=f=120:t=q:w=1:g=-1,"
            "equalizer=f=4000:t=q:w=1.5:g=2,"
            "equalizer=f=12000:t=q:w=1:g=3,"
            "acompressor=threshold=-22dB:ratio=2:attack=30:release=400:makeup=1.5,"
            "loudnorm=I=-16:TP=-1:LRA=11"
        ),
    },
    {
        "id": "tape",
        "name": "Tape",
        "color": "#F59E0B",
        "icon": "Radio",
        "genres": ["Jazz", "Alternative", "Indie", "Rock"],
        "description": "Warm saturation with analog dynamics.",
        "lufs": -13,
        "targets": ["youtube", "mastering"],
        "filter": (
            "equalizer=f=100:t=q:w=1:g=2,"
            "equalizer=f=8000:t=q:w=1:g=-1.5,"
            "acompressor=threshold=-20dB:ratio=2.5:attack=40:release=300:makeup=2,"
            "aecho=0.6:0.3:40:0.2,"
            "loudnorm=I=-13:TP=-1:LRA=10"
        ),
    },
    {
        "id": "natural",
        "name": "Natural",
        "color": "#10B981",
        "icon": "Leaf",
        "genres": ["Acoustic", "Jazz", "Singer-songwriter"],
        "description": "Balanced dynamics and gentle compression.",
        "lufs": -16,
        "targets": ["apple_music", "broadcast"],
        "filter": (
            "equalizer=f=200:t=q:w=1:g=0.8,"
            "equalizer=f=5000:t=q:w=1:g=0.8,"
            "acompressor=threshold=-24dB:ratio=1.8:attack=50:release=500:makeup=1,"
            "loudnorm=I=-16:TP=-1.5:LRA=12"
        ),
    },
    {
        "id": "spatial",
        "name": "Spatial",
        "color": "#8B5CF6",
        "icon": "Orbit",
        "genres": ["Ambient", "Experimental", "Electronic"],
        "description": "Atmospheric reverb and enhanced stereo width.",
        "lufs": -14,
        "targets": ["streaming", "youtube"],
        "filter": (
            "equalizer=f=5000:t=q:w=1:g=1.5,"
            "extrastereo=m=1.6,"
            "aecho=0.8:0.88:60|80:0.4|0.3,"
            "acompressor=threshold=-20dB:ratio=2:attack=20:release=300:makeup=2,"
            "loudnorm=I=-14:TP=-1:LRA=10"
        ),
    },
    {
        "id": "cinematic",
        "name": "Cinematic",
        "color": "#EAB308",
        "icon": "Film",
        "genres": ["Soundtrack", "Orchestral", "Classical"],
        "description": "Intense saturation and harmonic distortion.",
        "lufs": -12,
        "targets": ["mastering"],
        "filter": (
            "equalizer=f=60:t=q:w=1:g=2.5,"
            "equalizer=f=400:t=q:w=1:g=-2,"
            "equalizer=f=8000:t=q:w=1:g=1.5,"
            "acompressor=threshold=-18dB:ratio=3.5:attack=15:release=220:makeup=2.5,"
            "loudnorm=I=-12:TP=-1:LRA=8"
        ),
    },
    {
        "id": "punch",
        "name": "Punch",
        "color": "#EC4899",
        "icon": "Zap",
        "genres": ["Hip Hop", "Trap", "R&B"],
        "description": "Energetic bass combined with boosted highs.",
        "lufs": -10,
        "targets": ["mastering"],
        "filter": (
            "equalizer=f=50:t=q:w=1:g=4,"
            "equalizer=f=250:t=q:w=1:g=-2,"
            "equalizer=f=3000:t=q:w=1:g=1.5,"
            "equalizer=f=10000:t=q:w=1:g=2.5,"
            "acompressor=threshold=-14dB:ratio=4.5:attack=6:release=160:makeup=3.5,"
            "loudnorm=I=-10:TP=-1:LRA=7"
        ),
    },
]

PRESET_MAP = {p["id"]: p for p in PRESETS}


def get_preset_public():
    """Return presets without ffmpeg filter (frontend-safe)."""
    return [
        {k: v for k, v in p.items() if k != "filter"}
        for p in PRESETS
    ]
