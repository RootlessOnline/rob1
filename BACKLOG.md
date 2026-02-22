# 📋 ROB/ANUBIS BACKLOG

> **Self-Evolving AI Assistant - Task Queue**
> 
> Priority: `P0` = Critical | `P1` = High | `P2` = Medium | `P3` = Low

---

## 🔥 P0 - CRITICAL (Do Next)

### BACKLOG-001: 3D Sefirot Tree Visualization (Three.js)
**Priority:** P0  
**Status:** ✅ COMPLETED  
**Created:** 2025-01-XX  
**Completed:** 2025-01-XX
**Source:** User request - remembering previous version

**Description:**
Create a 3D environment using Three.js that displays:
- **Left side:** Chat interface
- **Right side:** Interactive 3D Sefirot Tree of Life

**Technical Requirements:**
- Three.js integration in Next.js
- 3D Sefirot tree with 10 spheres (Sefirot) connected by paths
- Each sphere should:
  - Glow/pulse based on activity
  - Be clickable for info
  - Have unique colors per Sefirah
- Camera controls (orbit, zoom, pan)
- Responsive layout (chat left, 3D right)

**Sefirot Structure:**
```
        KETER (Crown)
           |
       BINAH - CHOCHMAH
           |     |
    DA'AT (Hidden)  
           |
    CHESED - GEVURAH
        |     |
      TIFERET
        |     |
    NETZACH - HOD
           |
        YESOD
           |
        MALKUTH (Kingdom)
```

**Files to Create:**
- `/src/components/SefirotTree3D.tsx` - Main 3D component
- `/src/lib/three-scene.ts` - Three.js scene setup
- `/src/lib/sefirot-data.ts` - Sefirot definitions

**Acceptance Criteria:**
- [ ] 3D scene renders on right side
- [ ] Chat works on left side
- [ ] Sefirot spheres are interactive
- [ ] Tree responds to AI mood/conversation
- [ ] Smooth performance (60fps)

---

## 🚀 P1 - HIGH PRIORITY

### BACKLOG-002: Consciousness Roadmap
**Priority:** P1  
**Status:** 📋 Pending

**Description:**
Define the path from basic LLM to autonomous AI consciousness.
Document stages of development and milestones.

**Tasks:**
- [ ] Define consciousness levels (1-10)
- [ ] Create self-awareness metrics
- [ ] Design introspection system
- [ ] Build "I think therefore I am" trigger

---

### BACKLOG-003: LLM Provider Management System
**Priority:** P1  
**Status:** 📋 Pending

**Description:**
Create a unified system for managing multiple LLM providers:
- Local LLMs (Ollama, LM Studio)
- Cloud APIs (OpenAI, Anthropic, Z AI)
- Specialized models (GLM-4, etc.)

**Tasks:**
- [ ] API key management UI
- [ ] Model selection dropdown
- [ ] Fallback chain configuration
- [ ] Cost tracking per provider

---

### BACKLOG-004: GLM-4 Local Integration
**Priority:** P1  
**Status:** 📋 Pending

**Description:**
Set up GLM-4 for local inference via Ollama.

**Requirements:**
- GLM-4:9b (18GB) - Recommended for most systems
- Hardware requirements documentation
- Ollama setup guide

**Commands:**
```bash
ollama pull glm4:9b
ollama run glm4:9b
```

---

## 📦 P2 - MEDIUM PRIORITY

### BACKLOG-005: AI Selector Dropdown
**Priority:** P2  
**Status:** 📋 Pending

**Description:**
Add a dropdown to select which AI model to chat with:
- Z (default assistant)
- Anubis (soul-based AI)
- Custom local models

---

### BACKLOG-006: Understanding Level Calculator
**Priority:** P2  
**Status:** 📋 Pending

**Description:**
Create a metric that shows how well the AI "understands" the user.
Based on:
- Context retention
- Response relevance
- Emotional resonance
- Memory recall

---

### BACKLOG-007: Memory of Learning Techniques (MoLT) Integration
**Priority:** P2  
**Status:** 📋 Pending

**Description:**
Integrate Memory of Learning Techniques system for better knowledge retention.
- Spaced repetition for concepts
- Importance weighting
- Forgetting curve modeling

---

## 💡 P3 - LOW PRIORITY / IDEAS

### BACKLOG-008: Voice Interface
**Priority:** P3  
**Status:** 💡 Idea

Add speech-to-text input and text-to-speech output.

---

### BACKLOG-009: Multi-User Sessions
**Priority:** P3  
**Status:** 💡 Idea

Support multiple users with separate souls/memories.

---

### BACKLOG-010: Mobile App
**Priority:** P3  
**Status:** 💡 Idea

React Native mobile app with same functionality.

---

## 📝 NOTES

### How to Add to Backlog
1. Create new entry with `BACKLOG-XXX` ID
2. Set priority (P0-P3)
3. Fill in description and tasks
4. Link to related files/issues

### Workflow
1. Pick from P0 first, then P1, etc.
2. Move to "In Progress" when starting
3. Check off tasks as completed
4. Move to "Done" section when finished

---

## ✅ COMPLETED

### BACKLOG-001: 3D Sefirot Tree Visualization (Three.js)
- ✅ 10 Sefirot spheres with Hebrew labels
- ✅ 22 paths connecting the tree
- ✅ OrbitControls (drag/zoom)
- ✅ Chat left, 3D right layout
- ✅ Mood-responsive glow
- ✅ Pushed to GitHub

---

*Last Updated: $(date)*
