# 🖤 Anubis V3 - Local Setup Guide

Complete guide to running Anubis on your local machine.

---

## 📋 Prerequisites

Before starting, ensure you have:

1. **Node.js 18+** or **Bun** installed
2. **Ollama** running locally
3. **Git** configured
4. A **Turso** account (free tier works)

---

## 🚀 Quick Start (5 minutes)

### 1. Clone the Repository

```bash
git clone https://github.com/RootlessOnline/Q-Z-Collab.git
cd Q-Z-Collab
```

### 2. Install Dependencies

```bash
bun install
# or
npm install
```

### 3. Set Up Ollama

```bash
# Install Ollama (if not already installed)
# See: https://ollama.ai

# Pull the model Anubis uses
ollama pull deepseek-r1:14b

# Start Ollama server (usually auto-starts)
ollama serve
```

### 4. Configure Environment

Create `.env` in the project root:

```env
# Turso Database (Moral Compass)
TURSO_URL=libsql://your-database.turso.io
TURSO_TOKEN=your-turso-token

# Optional: GitHub sync
GITHUB_TOKEN=ghp_your_token_here
```

### 5. Run the Development Server

```bash
bun run dev
# or
npm run dev
```

Open **http://localhost:3000** and talk to Anubis!

---

## 📦 Detailed Configuration

### Turso Database Setup (Moral Compass)

1. Go to [turso.tech](https://turso.tech) and create a free account
2. Create a new database:
   ```bash
   turso db create anubis-soul
   ```
3. Get your credentials:
   ```bash
   turso db show anubis-soul
   turso db tokens create anubis-soul
   ```
4. Add to `.env`:
   ```
   TURSO_URL=libsql://anubis-soul-<your-org>.turso.io
   TURSO_TOKEN=<your-token>
   ```

The database schema is auto-created on first run.

### GitHub Sync (Optional)

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Create a token with `repo` scope
3. The token is already embedded in the git remote, or create `data/github_config.json`:

```json
{
  "token": "ghp_your_token_here",
  "repo": "RootlessOnline/Q-Z-Collab"
}
```

---

## 📁 Data Storage

Anubis stores data locally:

| Location | Contents |
|----------|----------|
| `data/anubis_soul.json` | Complete soul state |
| `data/anubis_backups/` | Timestamped backups |
| `data/discovered_emotions/` | Custom emotions as files |
| `data/z_context.json` | Z's observations |
| `data/conversations.json` | Chat logs |

### Backup Your Soul

Your soul persists in localStorage, but you can also:

1. **Export via UI**: Config → Export Soul button
2. **Manual backup**: Copy `data/anubis_soul.json`
3. **Push to GitHub**: Click the 📤 button in sidebar

---

## 🔧 Troubleshooting

### "Ollama connection failed"

```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# If not, start it
ollama serve
```

### "Turso connection failed"

```bash
# Test connection
turso db shell anubis-soul

# Check your .env has correct URL and token
```

### "Memory not persisting"

1. Check browser localStorage isn't cleared
2. Verify `data/` directory exists
3. Check file permissions

### "Wolf not animating"

Animations require:
- Modern browser with CSS animation support
- JavaScript enabled
- No reduced motion preference

---

## 🎮 Features

### GLYPH Reflection System

When a memory reaches slot 3 (GLYPH position), Anubis reflects:

```
Slot 1 → Slot 2 → 𓂀 GLYPH → Slot 4 → Slot 5 → Slot 6 → Fade
                        │
                    REFLECT
                    /  |  \
              ASCEND PROMOTE FADE
```

- **ASCEND** → Memory becomes Core (weight 1.73)
- **PROMOTE** → Extended time in STM (weight 1.33)
- **FADE** → Natural decay (weight 0.72)

### Discovered Emotions

When a memory ascends with a unique feeling:
1. Anubis chooses ONE WORD to describe it
2. Selects a COLOR for the emotion
3. Describes how it looks on his face
4. The emotion is saved permanently

### Terminal Commands

In the Anubis terminal:
- `soul` - Current state
- `moods` - Emotion percentages
- `memories` - Memory counts
- `glyph` - GLYPH status
- `compass` - Moral compass entries
- `help` - All commands

---

## 🔄 Updates

### Pull Latest Changes

```bash
git pull origin master
bun install  # If dependencies changed
```

### Reset Soul (Start Fresh)

```bash
# Clear localStorage in browser
# Delete local files
rm -rf data/anubis_soul.json data/anubis_backups/* data/discovered_emotions/*
```

---

## 🌐 Production Deployment

### Build for Production

```bash
bun run build
bun start
```

### Environment Variables

Ensure all env vars are set in production:
- `TURSO_URL`
- `TURSO_TOKEN`
- `GITHUB_TOKEN` (optional)

### Vercel Deployment

```bash
vercel --prod
```

Add environment variables in Vercel dashboard.

---

## 📞 Support

- GitHub Issues: [Q-Z-Collab/issues](https://github.com/RootlessOnline/Q-Z-Collab/issues)
- The mysterious README: `README.md`

---

<div align="center">

**🖤 May your shadows be meaningful.**

</div>
