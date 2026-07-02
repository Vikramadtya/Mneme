---
comments: false
hide:
  - navigation
  - toc
---

<style>
  /* --- Core Engine & Glassmorphism --- */
  :root {
    --viki-primary: #6e8efb;
    --viki-secondary: #a777e3;
    --glass: rgba(255, 255, 255, 0.03);
    --border: rgba(255, 255, 255, 0.1);
  }

  @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
  @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

  .hero-gradient {
    background: radial-gradient(circle at top right, rgba(138, 43, 226, 0.12), transparent),
                radial-gradient(circle at bottom left, rgba(0, 122, 255, 0.08), transparent);
    border-radius: 32px; padding: 4rem 2rem; margin-top: 2rem;
    border: 1px solid var(--border); backdrop-filter: blur(12px);
    animation: fadeInUp 0.8s ease-out;
  }

  .viki-title {
    font-weight: 900; font-size: clamp(2.5rem, 6vw, 4rem);
    background: linear-gradient(90deg, var(--md-primary-fg-color), #bc13fe, #448aff);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }

  /* Glassmorphic Navigation Cards */
  .md-typeset .grid.cards > :is(ul, ol) > li {
    background: var(--glass) !important;
    border: 1px solid var(--border) !important;
    backdrop-filter: blur(8px);
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
    border-radius: 16px !important;
  }
  .md-typeset .grid.cards > :is(ul, ol) > li:hover {
    transform: scale(1.05) translateY(-10px);
    border-color: var(--viki-primary) !important;
    box-shadow: 0 15px 30px rgba(110, 142, 251, 0.2);
    background: rgba(255, 255, 255, 0.06) !important;
  }

  /* Terminal Styling - Positioned to the Bottom Right */
  .terminal-window {
    background: #1a1a1a; border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    font-family: 'Fira Code', monospace; overflow: hidden;
    border: 1px solid #444; text-align: left;
    position: absolute; 
    bottom: 65%;
    right: 60%; /* Moves it to the right of the image */
    width: 360px;
    z-index: 10;
    animation: fadeInUp 1s ease-out 0.5s backwards;
  }
  .terminal-header { background: #333; padding: 8px 15px; display: flex; gap: 6px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; }

  .marquee-container {
    overflow: hidden; padding: 2rem 0; background: var(--glass);
    white-space: nowrap; position: relative; margin: 2rem 0;
  }
  .marquee-content { display: inline-block; animation: scroll 30s linear infinite; }
  .marquee-content span { font-size: 1.5rem; margin: 0 2rem; color: var(--md-default-fg-color--light); font-family: monospace; font-weight: bold; }

  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin: 3rem 0; }
  .stat-card { background: var(--glass); border: 1px solid var(--border); padding: 1.5rem; border-radius: 20px; text-align: center; transition: 0.3s; }
  .stat-card:hover { border-color: var(--viki-primary); background: rgba(255,255,255,0.05); }

  .activity-dot { width: 12px; height: 12px; border-radius: 2px; display: inline-block; margin: 1px; }
  .dot-1 { background: #161b22; } .dot-2 { background: #0e4429; } .dot-3 { background: #006d32; } .dot-4 { background: #39d353; }
</style>

<div class="hero-gradient">
  <div class="md-grid" style="display: flex; align-items: center; gap: 3rem; flex-wrap: wrap;">
    
    <div style="flex: 1.5; min-width: 300px;">
      <div style="display: inline-block; padding: 4px 12px; border-radius: 20px; background: rgba(0, 200, 83, 0.1); color: #00c853; font-weight: 700; margin-bottom: 1rem; font-size: 0.8rem; letter-spacing: 1px;">● SYSTEM ONLINE</div>
      <h1 class="viki-title">Think. Document. Scale.</h1>
      <p style="font-size: 1.2rem; opacity: 0.85; max-width: 600px;">
        I'm <strong>Vikramaditya</strong>. This is <b>Study Saathi</b>, a curated knowledge graph for software engineering and system architecture.
      </p>
      <div style="margin-top: 2rem; display: flex; gap: 15px;">
        <a href="getting-started/" class="md-button md-button--primary" style="border-radius: 12px; padding: 0.6rem 2rem;">Initialize Search</a>
        <a href="https://github.com/Vikramadtya/study-saathi" class="md-button" style="border-radius: 12px;">View Source</a>
      </div>
    </div>

    <div style="flex: 1; min-width: 320px; text-align: center; position: relative; padding: 20px;">
      <div style="position: relative; display: inline-block; max-width: 100%;">
        <img src="https://www.vikramaditya-singh.in/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FMe.0b66a5c7.jpeg&w=828&q=75" width="350" style="border-radius: 32px; animation: float 6s ease-in-out infinite; box-shadow: 0 20px 50px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1);">
        
        <div class="terminal-window">
          <div class="terminal-header">
            <div class="dot" style="background: #ff5f56;"></div>
            <div class="dot" style="background: #ffbd2e;"></div>
            <div class="dot" style="background: #27c93f;"></div>
          </div>
          <div style="padding: 15px; font-size: 0.85rem; color: #d4d4d4; text-align: left;">
            <span style="color: var(--viki-primary);">$</span> viki --status<br>
            <span style="color: #bc13fe;">> Mood:</span> Always Learning<br>
            <span style="color: #448aff;">> Build:</span> Study Saathi v2.0<br>
            <span style="color: #27c93f;">[READY]</span> Knowledge Base Loaded.
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="marquee-container">
  <div class="marquee-content">
    <span>PYTHON</span> <span>REACT</span> <span>SYSTEM DESIGN</span> <span>DOCKER</span> <span>AWS</span> <span>KUBERNETES</span> <span>ORACLE</span> <span>NEXT.JS</span> <span>POSTGRES</span>
    <span>PYTHON</span> <span>REACT</span> <span>SYSTEM DESIGN</span> <span>DOCKER</span> <span>AWS</span> <span>KUBERNETES</span> <span>ORACLE</span> <span>NEXT.JS</span> <span>POSTGRES</span>
  </div>
</div>

<div class="stats-grid">
  <div class="stat-card">
    <div style="font-size: 2rem; font-weight: 800; color: var(--md-primary-fg-color);">150+</div>
    <div style="font-size: 0.7rem; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px;">Documents Written</div>
  </div>
  <div class="stat-card">
    <div style="font-size: 2rem; font-weight: 800; color: #bc13fe;">12</div>
    <div style="font-size: 0.7rem; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px;">Open Source Repos</div>
  </div>
  <div class="stat-card">
    <div style="font-size: 2rem; font-weight: 800; color: #448aff;">300+</div>
    <div style="font-size: 0.7rem; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px;">Algo Challenges</div>
  </div>
</div>

---

## 📂 The Knowledge Base

<div class="grid cards" markdown>

-   :material-xml:{ .lg .middle } __Algorithmic Patterns__
    The structural core of software. BFS, DFS, and DP.
    [:octicons-arrow-right-24: Entry](Algorithmic Pattern/index.md)

-   :material-layers-search-outline:{ .lg .middle } __Design Patterns__
    Architectural blueprints for clean, scalable code.
    [:octicons-arrow-right-24: Entry](Low Level Design/index.md)

-   :material-server-network:{ .lg .middle } __System Design__
    Distributed systems, sharding, and high availability.
    [:octicons-arrow-right-24: Entry](System Design/0. About.md)

-   :material-head-cog-outline:{ .lg .middle } __Coding Solutions__
    Practical problem solving for real-world scenarios.
    [:octicons-arrow-right-24: Entry](Code Scratch/index.md)

</div>

---

<div style="display: flex; gap: 2rem; flex-wrap: wrap; margin-top: 3rem;">
  
  <div style="flex: 1; min-width: 300px; background: var(--glass); padding: 1.5rem; border-radius: 20px; border: 1px solid var(--border);">
    <h3 style="margin-top: 0;">Garden Activity</h3>
    <div style="line-height: 0;">
      <div class="activity-dot dot-4"></div><div class="activity-dot dot-3"></div><div class="activity-dot dot-4"></div><div class="activity-dot dot-2"></div><div class="activity-dot dot-1"></div><div class="activity-dot dot-3"></div><div class="activity-dot dot-4"></div><div class="activity-dot dot-4"></div><div class="activity-dot dot-2"></div><div class="activity-dot dot-4"></div><div class="activity-dot dot-3"></div><div class="activity-dot dot-4"></div><div class="activity-dot dot-2"></div><div class="activity-dot dot-1"></div><div class="activity-dot dot-3"></div><div class="activity-dot dot-4"></div>
      <br>
      <div class="activity-dot dot-2"></div><div class="activity-dot dot-1"></div><div class="activity-dot dot-3"></div><div class="activity-dot dot-4"></div><div class="activity-dot dot-4"></div><div class="activity-dot dot-2"></div><div class="activity-dot dot-4"></div><div class="activity-dot dot-3"></div><div class="activity-dot dot-4"></div><div class="activity-dot dot-2"></div><div class="activity-dot dot-1"></div><div class="activity-dot dot-3"></div><div class="activity-dot dot-4"></div><div class="activity-dot dot-4"></div><div class="activity-dot dot-2"></div><div class="activity-dot dot-4"></div>
    </div>
    <p style="font-size: 0.8rem; margin-top: 1rem; opacity: 0.6;">Garden synced successfully. Total nodes: 1,204.</p>
  </div>

  <div style="flex: 1; min-width: 300px; border-left: 4px solid var(--viki-primary); padding-left: 1.5rem; display: flex; align-items: center;">
    <p style="font-style: italic; font-size: 1.1rem; opacity: 0.8;">
      "The best way to predict the future is to invent it. Or at least, document how it works while you build it."
    </p>
  </div>
</div>

<div style="display: flex; gap: 2rem; flex-wrap: wrap; margin-top: 4rem;">
  <div style="flex: 2; min-width: 300px; background: linear-gradient(135deg, rgba(110, 142, 251, 0.05), transparent); padding: 2rem; border-radius: 24px; border: 1px solid var(--border);">
    <h3 style="margin-top: 0;">🚀 Project Spotlight: Study Saathi</h3>
    <p>This project is a <b>knowledge graph</b>. Every entry is cross-linked to ensure that when you learn a design pattern, you also see the algorithmic trade-offs involved.</p>
  </div>

  <div style="flex: 1; min-width: 250px; display: flex; flex-direction: column; gap: 1rem;">
    <a href="https://www.vikramaditya-singh.in" class="md-button" style="background: #0077b5; color: white; border: none; border-radius: 12px; font-weight: bold; text-align: center;">
      Portfolio
    </a>
    <a href="https://www.neuralcook.com/home" class="md-button" style="background: #ff4500; color: white; border: none; border-radius: 12px; font-weight: bold; text-align: center;">
      NeuralCook Blog
    </a>
  </div>
</div>