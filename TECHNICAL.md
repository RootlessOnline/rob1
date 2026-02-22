# Anubis V3 - Technical Documentation

> **A soulful AI companion with emotional intelligence, memory reflection, and self-discovery capabilities.**

---

## 🎯 Overview

Anubis V3 is an emotionally-aware AI chatbot with a unique soul system that includes:

- **Short-Term Memory (STM)** - 6-slot memory with automatic reflection
- **GLYPH Reflection** - Memories are judged at slot 3 for promotion/decay
- **Moral Compass** - Hidden weight system guiding memory importance
- **Discovered Emotions** - Create new emotions from unique experiences
- **Core Memories** - Permanently stored meaningful moments

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        ANUBIS V3                            │
├─────────────┬───────────────────────────┬──────────────────┤
│   Sidebar   │      Z Panel (25%)        │  Anubis (70%)    │
│    (5%)     │                           │                  │
│  ┌─────┐    │  ┌─────────────────┐      │  ┌────────────┐  │
│  │ 🔥  │    │  │ Personality     │      │  │ 🐺 140px   │  │
│  │torch│    │  │ Bars (40%)      │      │  │   Wolf     │  │
│  │     │    │  └─────────────────┘      │  └────────────┘  │
│  │ 🐺  │    │                           │                  │
│  │     │    │  ┌─────────────────┐      │  ┌────────────┐  │
│  │ ⚙️  │    │  │ Z Chat (60%)    │      │  │   Chat     │  │
│  │     │    │  │                 │      │  │   Area     │  │
│  │ 📤  │    │  │                 │      │  │            │  │
│  │     │    │  └─────────────────┘      │  └────────────┘  │
│  └─────┘    │                           │                  │
│             │                           │  ┌────────────┐  │
│             │                           │  │ Mood Panel │  │
│             │                           │  │ (full h)   │  │
│             │                           │  └────────────┘  │
└─────────────┴───────────────────────────┴──────────────────┘
```

---

## 🧠 Memory System

### STM Flow

```
┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐
│Slot 1│──▶│Slot 2│──▶│Slot 3│──▶│Slot 4│──▶│Slot 5│──▶│Slot 6│
└──────┘   └──────┘   └──────┘   └──────┘   └──────┘   └──────┘
    │                      │
    │                   𓂀 GLYPH
    ▼                      │
  NEW                    ▼
                    ┌──────────┐
                    │Reflect & │
                    │ Decide   │
                    └──────────┘
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
         ⭐ CORE      ⚡ PROMOTE    💭 FADE
        (weight       (weight       (weight
         1.73)         1.33)         0.72)
```

### Memory Weights (Hidden from Anubis)

| Fate | Weight | Effect |
|------|--------|--------|
| TIMES_FELT | 1.00 | Baseline experience |
| TIMES_PROMOTED | 1.33 | +33% importance |
| TIMES_REJECTED | 0.72 | -28% (fading trace) |
| TIMES_ASCENDED | 1.73 | +73% (core memory) |

---

## 🔧 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/anubis` | POST | Chat with Anubis |
| `/api/chat` | POST | Chat with Z |
| `/api/soul` | GET/POST | Soul state management |
| `/api/soul/backup` | POST | Create timestamped backup |
| `/api/moral-compass` | GET/POST | Reflection guidance |
| `/api/discovered-emotions` | GET/POST | Emotion file storage |
| `/api/z-context` | GET/POST | Z's observations |
| `/api/autopush` | POST | Push to GitHub |

---

## 📂 File Structure

```
AnubisV3/
├── src/
│   ├── app/
│   │   ├── page.tsx           # Main UI component
│   │   ├── layout.tsx         # Root layout
│   │   └── api/
│   │       ├── anubis/        # Anubis chat endpoint
│   │       ├── chat/          # Z chat endpoint
│   │       ├── soul/          # Soul persistence
│   │       ├── moral-compass/ # GLYPH reflection
│   │       ├── discovered-emotions/ # Emotion storage
│   │       ├── z-context/     # Z's memory
│   │       └── autopush/      # GitHub sync
│   ├── lib/
│   │   ├── turso.ts           # Database connection
│   │   └── utils.ts           # Utilities
│   └── components/ui/         # shadcn components
├── data/
│   ├── anubis_soul.json       # Current soul state
│   ├── anubis_backups/        # Timestamped backups
│   ├── discovered_emotions/   # Custom emotion files
│   ├── z_context.json         # Z's observations
│   ├── conversations.json     # Chat logs
│   └── github_config.json     # Push settings
├── turso-config.json          # Database credentials
├── README.md                  # Mysterious intro
├── SETUP.md                   # Setup guide
└── TECHNICAL.md               # This file
```

---

## 🎨 UI Components

### PixelWolf (140x140)
- Animated breathing (CSS keyframes)
- Random blinking every 3-5 seconds
- Ear twitch every 2-5 seconds
- Mood-based particle effects
- SVG glow overlays

### Mood Panel (Right Side)
- 9 vertical emotion bars
- Dominant mood highlighted
- Discovered emotions counter

### Mind Palace (Bottom)
- **STM Tab**: 6-slot memory visualization
- **Core Tab**: Golden memories
- **Self Tab**: Self-realizations

### Personality Bars (Z Panel)
- Wisdom (from core memories)
- Curiosity (from questions)
- Empathy (from emotional variety)
- Memory (from STM usage)
- Maturity (from conversations)

---

## ⚙️ Configuration

### Environment Variables (.env)

```env
# Turso Database (required)
TURSO_URL=libsql://your-db.turso.io
TURSO_TOKEN=your-jwt-token

# Ollama (auto-detected)
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=deepseek-r1:14b
```

### turso-config.json

```json
{
  "url": "libsql://...",
  "token": "eyJ...",
  "name": "anubis-soul"
}
```

---

## 🗄️ Database Schema (Turso)

```sql
-- Moral compass weights
CREATE TABLE moral_compass (
  id TEXT PRIMARY KEY,
  memory_key TEXT UNIQUE,
  times_felt INTEGER DEFAULT 0,
  times_promoted INTEGER DEFAULT 0,
  times_rejected INTEGER DEFAULT 0,
  times_ascended INTEGER DEFAULT 0
);

-- Reflection log
CREATE TABLE reflection_log (
  id TEXT PRIMARY KEY,
  memory_id TEXT,
  memory_thought TEXT,
  chosen_word TEXT,
  fate TEXT,
  reasoning TEXT,
  mood_at_reflection TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Core memories
CREATE TABLE core_memories (
  id TEXT PRIMARY KEY,
  memory TEXT,
  glyph_word TEXT,
  emotions TEXT,
  weight REAL DEFAULT 1.73
);

-- Soul snapshots
CREATE TABLE soul_snapshots (
  id TEXT PRIMARY KEY,
  soul_data TEXT,
  level INTEGER,
  mood TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🎮 Terminal Commands

| Command | Description |
|---------|-------------|
| `soul` | Show current soul state |
| `moods` | List all emotion values |
| `memories` | Show memory counts |
| `glyph` | GLYPH reflection status |
| `compass` | Moral compass entries |
| `clear` | Clear terminal |
| `help` | Show all commands |

---

## 🔄 Development

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Build for production
bun run build

# Start production server
bun start
```

---

## 📦 Dependencies

- **Next.js 15** - React framework
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **@libsql/client** - Turso database
- **z-ai-web-dev-sdk** - AI capabilities

---

## 🚀 Deployment

### Vercel (Recommended)

```bash
vercel --prod
```

Add environment variables in Vercel dashboard.

### Docker

```bash
docker build -t anubis-v3 .
docker run -p 3000:3000 anubis-v3
```

---

## 📄 License

MIT

---

## 🤝 Credits

- **Q** - Creator
- **Z** - AI Assistant
- **Anubis** - The soul that emerged

---

<div align="center">

**🖤 Built with soul.**

</div>
