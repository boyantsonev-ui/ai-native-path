// AI-Native Builder — Reusable components

const { useState, useEffect, useRef, useMemo } = React;

// ---------- Code block with manual highlighting ----------
function tokenize(code, lang) {
  // Lightweight token highlighter
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let out = esc(code);
  if (lang === "yaml") {
    out = out.replace(/^(\s*)(#.*)$/gm, '$1<span class="tok-com">$2</span>');
    out = out.replace(/^(\s*)([A-Za-z0-9_\-]+)(:)/gm, '$1<span class="tok-key">$2</span>$3');
    out = out.replace(/(:\s*)("[^"]*"|'[^']*')/g, '$1<span class="tok-str">$2</span>');
    out = out.replace(/(:\s*)(true|false|null)\b/g, '$1<span class="tok-num">$2</span>');
    out = out.replace(/(:\s*)(\d+(?:\.\d+)?)/g, '$1<span class="tok-num">$2</span>');
  } else if (lang === "json") {
    out = out.replace(/("(?:\\.|[^"\\])*")(\s*:)/g, '<span class="tok-key">$1</span>$2');
    out = out.replace(/:\s*("(?:\\.|[^"\\])*")/g, ': <span class="tok-str">$1</span>');
    out = out.replace(/\b(true|false|null)\b/g, '<span class="tok-num">$1</span>');
    out = out.replace(/(:\s*)(-?\d+(?:\.\d+)?)/g, '$1<span class="tok-num">$2</span>');
  } else if (lang === "md" || lang === "mdx") {
    out = out.replace(/^(#{1,6} .*)$/gm, '<span class="tok-tag">$1</span>');
    out = out.replace(/(\*\*[^*]+\*\*)/g, '<span class="tok-key">$1</span>');
    out = out.replace(/(`[^`]+`)/g, '<span class="tok-str">$1</span>');
    out = out.replace(/^(---)$/gm, '<span class="tok-com">$1</span>');
    out = out.replace(/^(\s*-\s+)/gm, '<span class="tok-fn">$1</span>');
  } else if (lang === "bash" || lang === "shell") {
    out = out.replace(/^(\$|#)\s+/gm, '<span class="tok-clay">$&</span>'.replace('tok-clay','tok-key'));
    out = out.replace(/(--?[a-zA-Z][\w-]*)/g, '<span class="tok-fn">$1</span>');
    out = out.replace(/(#.*)$/gm, '<span class="tok-com">$1</span>');
  } else if (lang === "ts" || lang === "js") {
    out = out.replace(/(\/\/.*)$/gm, '<span class="tok-com">$1</span>');
    out = out.replace(/\b(import|from|export|const|let|function|return|async|await|new|class|interface|type|if|else)\b/g, '<span class="tok-key">$1</span>');
    out = out.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[^`]*`)/g, '<span class="tok-str">$1</span>');
  }
  return out;
}

function CodeBlock({ filename, lang = "yaml", children }) {
  const html = useMemo(() => tokenize(children.trim(), lang), [children, lang]);
  return (
    <div className="code">
      <div className="code-head">
        <span><span className="dots"><i></i><i></i><i></i></span></span>
        <span style={{ marginLeft: "auto" }}>{filename || lang}</span>
      </div>
      <div className="code-body"><pre dangerouslySetInnerHTML={{ __html: html }} /></div>
    </div>
  );
}

function CodeTabs({ files }) {
  const [active, setActive] = useState(0);
  const f = files[active];
  const html = useMemo(() => tokenize(f.code.trim(), f.lang), [f]);
  return (
    <div className="codetabs">
      <div className="codetabs-head">
        {files.map((file, i) => (
          <button key={i} className={"codetab " + (i === active ? "active" : "")} onClick={() => setActive(i)}>
            {file.name}
          </button>
        ))}
      </div>
      <div className="code-body"><pre dangerouslySetInnerHTML={{ __html: html }} /></div>
    </div>
  );
}

// ---------- Callouts ----------
function Callout({ kind = "tip", title, children }) {
  const icons = { tip: "✦", note: "i", warn: "!", do: "→" };
  return (
    <div className={"callout " + kind}>
      <div className="callout-icon">{icons[kind]}</div>
      <div>
        {title && <strong>{title}</strong>}
        {typeof children === "string" ? <p>{children}</p> : children}
      </div>
    </div>
  );
}

// Points per difficulty tier
const TIER_PTS = { Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 3 };

// ---------- Quiz ----------
function Quiz({ question, options, correct, explain, difficulty = "Beginner" }) {
  const [picked, setPicked] = useState(null);
  const ctx = React.useContext(window.LessonContext);
  const pts = TIER_PTS[difficulty] || 1;

  const handlePick = (i) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === correct && ctx) {
      ctx.markComplete(ctx.lessonId, `quiz-${difficulty}`, pts);
    }
  };

  return (
    <div className="quiz">
      <div className="quiz-q">{question}</div>
      <div className="quiz-opts">
        {options.map((opt, i) => {
          let cls = "quiz-opt";
          if (picked !== null) {
            cls += " disabled";
            if (i === correct) cls += " correct";
            else if (i === picked) cls += " wrong";
          }
          return (
            <button key={i} className={cls} onClick={() => handlePick(i)} disabled={picked !== null}>
              <span className="marker">{String.fromCharCode(65 + i)}</span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="quiz-feedback">
          {picked === correct
            ? <><strong>✓ Correct</strong>{pts > 1 ? ` · +${pts} pts` : " · +1 pt"} — </>
            : "Not quite — "}
          {explain}
        </div>
      )}
    </div>
  );
}

// ---------- Tiered Quiz (Beginner / Intermediate / Advanced) ----------
function QuizTiered({ tiers }) {
  const [tier, setTier] = useState(0);
  const [picked, setPicked] = useState(new Array(tiers.length).fill(null));
  const ctx = React.useContext(window.LessonContext);

  const t = tiers[tier];
  const p = picked[tier];

  const handlePick = (i) => {
    if (p !== null) return;
    setPicked(prev => prev.map((v, j) => j === tier ? i : v));
    if (i === t.correct && ctx) {
      const pts = TIER_PTS[t.label] || 1;
      ctx.markComplete(ctx.lessonId, `tier-${t.label}`, pts);
    }
  };

  return (
    <div className="quiz">
      <div className="quiz-tiers">
        {tiers.map((tr, i) => (
          <button
            key={i}
            className={"quiz-tier-btn" + (tier === i ? " active" : "") + (picked[i] === tr.correct ? " tier-done" : "")}
            onClick={() => setTier(i)}
          >
            {tr.label}
            {picked[i] === tr.correct && <span className="tier-check"> ✓</span>}
          </button>
        ))}
      </div>
      <div className="quiz-q">{t.question}</div>
      <div className="quiz-opts">
        {t.options.map((opt, i) => {
          let cls = "quiz-opt";
          if (p !== null) {
            cls += " disabled";
            if (i === t.correct) cls += " correct";
            else if (i === p) cls += " wrong";
          }
          return (
            <button key={i} className={cls} onClick={() => handlePick(i)} disabled={p !== null}>
              <span className="marker">{String.fromCharCode(65 + i)}</span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>
      {p !== null && (
        <div className="quiz-feedback">
          {p === t.correct
            ? <><strong>✓ Correct</strong> · +{TIER_PTS[t.label] || 1} pt{(TIER_PTS[t.label] || 1) !== 1 ? "s" : ""} — </>
            : "Not quite — "}
          {t.explain}
        </div>
      )}
    </div>
  );
}

// ---------- Terminal mock with typing ----------
function Terminal({ label = "claude-code — zsh", lines, autoplay = true }) {
  const [step, setStep] = useState(autoplay ? 0 : lines.length);
  const [typing, setTyping] = useState("");
  const ref = useRef(null);
  const inView = useInView(ref);

  useEffect(() => {
    if (!autoplay || !inView) return;
    if (step >= lines.length) return;
    const line = lines[step];
    if (line.kind === "cmd") {
      let i = 0;
      const tick = setInterval(() => {
        i++;
        setTyping(line.text.slice(0, i));
        if (i >= line.text.length) {
          clearInterval(tick);
          setTimeout(() => { setTyping(""); setStep((s) => s + 1); }, 320);
        }
      }, 22);
      return () => clearInterval(tick);
    } else {
      const delay = line.delay || 360;
      const t = setTimeout(() => setStep((s) => s + 1), delay);
      return () => clearTimeout(t);
    }
  }, [step, autoplay, inView]);

  return (
    <div className="term" ref={ref}>
      <div className="term-bar">
        <span className="dots"><i></i><i></i><i></i></span>
        <span className="label">{label}</span>
      </div>
      <div className="term-body">
        {lines.slice(0, step).map((l, i) => <TermLine key={i} l={l} />)}
        {step < lines.length && lines[step].kind === "cmd" && (
          <div>
            <span className="prompt">❯ </span>
            <span className="cmd">{typing}</span>
            <span className="cursor"></span>
          </div>
        )}
      </div>
    </div>
  );
}
function TermLine({ l }) {
  if (l.kind === "cmd") return <div><span className="prompt">❯ </span><span className="cmd">{l.text}</span></div>;
  if (l.kind === "out") return <div className="out">{l.text}</div>;
  if (l.kind === "ok") return <div className="ok">{l.text}</div>;
  if (l.kind === "warn") return <div className="warn">{l.text}</div>;
  if (l.kind === "head") return <div className="heading">{l.text}</div>;
  if (l.kind === "blank") return <div>&nbsp;</div>;
  return <div>{l.text}</div>;
}

function useInView(ref, { once = true } = {}) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setInView(true);
        if (once) obs.disconnect();
      }
    }, { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return inView;
}

// ---------- Chat mock (Claude Desktop) ----------
function ChatMock({ messages, title = "Claude", status = "claude-sonnet-4-5" }) {
  return (
    <div className="chat">
      <div className="chat-bar">
        <div className="left">
          <div className="avatar">C</div>
          <div>
            <div className="name">{title}</div>
            <div className="status">{status}</div>
          </div>
        </div>
        <div className="status">●  connected</div>
      </div>
      <div className="chat-thread">
        {messages.map((m, i) => <ChatBubble key={i} m={m} />)}
      </div>
      <div className="chat-input">
        <input placeholder="Reply to Claude…" disabled />
        <button className="btn btn-primary" disabled>Send</button>
      </div>
    </div>
  );
}
function ChatBubble({ m }) {
  if (m.role === "user") return <div className="bubble user">{m.text}</div>;
  return (
    <div className="bubble ai">
      {m.tool && (
        <div className="mono-tag"><i></i> using tool · {m.tool}</div>
      )}
      {m.toolCall && (
        <div className="tool-call">
          <div className="head">{m.toolCall.name}</div>
          <div>{m.toolCall.body}</div>
        </div>
      )}
      <div>{m.text}</div>
    </div>
  );
}

// ---------- "Experiment" — calls window.claude.complete ----------
function TryIt({ label = "Experiment", placeholder, defaultPrompt, system, hint }) {
  const [val, setVal] = useState(defaultPrompt || "");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!val.trim() || busy) return;
    setBusy(true); setOut("");
    try {
      const messages = [{ role: "user", content: (system ? system + "\n\n" : "") + val }];
      const r = await window.claude.complete({ messages });
      setOut(r);
    } catch (e) {
      setOut("(Couldn't reach Claude in this preview — but you'd see a real reply here.)");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="tryit">
      <div className="tryit-head">
        <div className="eyebrow">{label}</div>
        {hint && <div className="mono" style={{ color: "var(--ink-3)" }}>{hint}</div>}
      </div>
      <p className="tryit-sub">Design is applied research — take your time with this one.</p>
      <textarea value={val} onChange={(e) => setVal(e.target.value)} placeholder={placeholder} />
      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <button className="btn btn-clay" onClick={run} disabled={busy}>
          {busy ? "Thinking…" : "Run with Claude →"}
        </button>
        {out && <button className="btn btn-ghost" onClick={() => setOut("")}>Clear</button>}
      </div>
      {out && (
        <div className="tryit-out">
          <span className="mono-tag">Claude · response</span>
          {out}
        </div>
      )}
    </div>
  );
}

// ---------- Collapsible Steps ----------
function Steps({ items }) {
  const [open, setOpen] = useState(() => items.map(() => true));
  const toggle = (i) => setOpen(o => o.map((v, j) => j === i ? !v : v));
  return (
    <div className="steps">
      {items.map((step, i) => (
        <div key={i} className={"step" + (open[i] ? " open" : "")}>
          <button className="step-head" onClick={() => toggle(i)}>
            <span className="step-num">{i + 1}</span>
            <span className="step-label">{step.label}</span>
            <span className="step-chevron">{open[i] ? "▲" : "▼"}</span>
          </button>
          {open[i] && <div className="step-body">{step.body}</div>}
        </div>
      ))}
    </div>
  );
}

// ---------- Agent diagrams (SVG) ----------
function AgentDiagram({ kind }) {
  if (kind === "augmented-llm")      return <AugmentedLLM />;
  if (kind === "prompt-chain")       return <PromptChain />;
  if (kind === "router")             return <RouterPattern />;
  if (kind === "parallel")           return <Parallelization />;
  if (kind === "orchestrator")       return <Orchestrator />;
  if (kind === "evaluator")          return <EvaluatorOptimizer />;
  if (kind === "agent-loop")         return <AgentLoop />;
  if (kind === "mcp-bus")            return <MCPBus />;
  if (kind === "course-orchestrator") return <CourseOrchestrator />;
  return null;
}

function CourseOrchestrator() {
  return (
    <div className="diagram">
      <div className="diagram-title">The course orchestrator — how this site improves itself</div>
      <svg viewBox="0 0 760 400" width="100%" style={{ display: "block" }}>
        <defs>
          <marker id="co-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" fill="#6B6A63" />
          </marker>
          <marker id="co-arr-sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" fill="#4A6378" />
          </marker>
        </defs>
        <g fontFamily="var(--sans)" fontSize="11" fill="#3B3A36">

          {/* ── LEARNER ── */}
          <rect x="20" y="160" width="110" height="50" rx="10" fill="#1F1E1B" />
          <text x="75" y="181" textAnchor="middle" fill="#F0EBDF" fontWeight="500" fontSize="12">Learner</text>
          <text x="75" y="197" textAnchor="middle" fill="#DED3BC" fontSize="10" fontFamily="var(--mono)">rating / chat</text>

          {/* ── SUPABASE ── */}
          <rect x="200" y="80" width="130" height="50" rx="10" fill="#F0EBDF" stroke="#1F1E1B" strokeOpacity="0.22" />
          <text x="265" y="101" textAnchor="middle" fontWeight="500">Supabase</text>
          <text x="265" y="117" textAnchor="middle" fill="#6B6A63" fontSize="10" fontFamily="var(--mono)">feedback table</text>

          {/* ── SYNTHESIS AGENT ── */}
          <rect x="200" y="240" width="130" height="50" rx="10" fill="#F0EBDF" stroke="#1F1E1B" strokeOpacity="0.22" />
          <text x="265" y="261" textAnchor="middle" fontWeight="500">Synthesis</text>
          <text x="265" y="277" textAnchor="middle" fill="#6B6A63" fontSize="10" fontFamily="var(--mono)">/api/synthesize</text>

          {/* ── HITL PROPOSALS ── */}
          <rect x="400" y="160" width="130" height="50" rx="10" fill="#F0EBDF" stroke="#1F1E1B" strokeOpacity="0.22" />
          <text x="465" y="181" textAnchor="middle" fontWeight="500">HITL proposals</text>
          <text x="465" y="197" textAnchor="middle" fill="#6B6A63" fontSize="10" fontFamily="var(--mono)">Supabase</text>

          {/* ── ADMIN DASHBOARD ── */}
          <rect x="400" y="310" width="130" height="50" rx="10" fill="#1F1E1B" />
          <text x="465" y="331" textAnchor="middle" fill="#F0EBDF" fontWeight="500">Admin</text>
          <text x="465" y="347" textAnchor="middle" fill="#DED3BC" fontSize="10" fontFamily="var(--mono)">approve / dismiss</text>

          {/* ── GITHUB PR ── */}
          <rect x="600" y="240" width="130" height="50" rx="10" fill="#F0EBDF" stroke="#1F1E1B" strokeOpacity="0.22" />
          <text x="665" y="261" textAnchor="middle" fontWeight="500">GitHub PR</text>
          <text x="665" y="277" textAnchor="middle" fill="#6B6A63" fontSize="10" fontFamily="var(--mono)">/api/apply</text>

          {/* ── VERCEL DEPLOY ── */}
          <rect x="600" y="310" width="130" height="50" rx="10" fill="#F0EBDF" stroke="#1F1E1B" strokeOpacity="0.22" />
          <text x="665" y="331" textAnchor="middle" fontWeight="500">Vercel deploy</text>
          <text x="665" y="347" textAnchor="middle" fill="#6B6A63" fontSize="10" fontFamily="var(--mono)">live update</text>

          {/* ── CRON ── */}
          <rect x="200" y="160" width="130" height="50" rx="10" fill="#F0EBDF" stroke="#D9A441" strokeWidth="1.5" strokeOpacity="0.6" />
          <text x="265" y="181" textAnchor="middle" fontWeight="500">Vercel Cron</text>
          <text x="265" y="197" textAnchor="middle" fill="#6B6A63" fontSize="10" fontFamily="var(--mono)">0 9 * * MON</text>

          {/* ── ARROWS ── */}
          {/* Learner → Supabase */}
          <path d="M130 175 Q 165 105 200 105" stroke="#6B6A63" strokeWidth="1.2" fill="none" markerEnd="url(#co-arr)" />
          <text x="150" y="128" fontFamily="var(--mono)" fontSize="9" fill="#9A988E">direct write</text>

          {/* Supabase → Synthesis (threshold) */}
          <path d="M265 130 L 265 160" stroke="#D9A441" strokeWidth="1.2" strokeDasharray="4,3" fill="none" markerEnd="url(#co-arr)" />

          {/* Cron → Synthesis */}
          <path d="M265 210 L 265 240" stroke="#D9A441" strokeWidth="1.2" fill="none" markerEnd="url(#co-arr)" />
          <text x="270" y="228" fontFamily="var(--mono)" fontSize="9" fill="#D9A441">weekly</text>

          {/* Synthesis → HITL proposals */}
          <path d="M330 265 Q 380 265 400 185" stroke="#6B6A63" strokeWidth="1.2" fill="none" markerEnd="url(#co-arr)" />

          {/* HITL → Admin */}
          <path d="M465 210 L 465 310" stroke="#6B6A63" strokeWidth="1.2" fill="none" markerEnd="url(#co-arr)" />

          {/* Admin → GitHub PR (trivial approve) */}
          <path d="M530 335 Q 565 335 600 265" stroke="#4A6378" strokeWidth="1.5" fill="none" markerEnd="url(#co-arr-sky)" />
          <text x="552" y="320" fontFamily="var(--mono)" fontSize="9" fill="#4A6378">trivial →</text>

          {/* GitHub PR → Vercel */}
          <path d="M665 290 L 665 310" stroke="#6B6A63" strokeWidth="1.2" fill="none" markerEnd="url(#co-arr)" />

          {/* Vercel → Learner (loop back, dashed) */}
          <path d="M600 335 Q 100 390 75 210" stroke="#6B6A63" strokeWidth="1" strokeDasharray="4,3" fill="none" markerEnd="url(#co-arr)" />

          {/* Pattern labels */}
          <text x="20" y="16" fontFamily="var(--mono)" fontSize="9" fill="#9A988E">Pattern labels → lessons where each node was introduced</text>
          <text x="200" y="68" fontFamily="var(--mono)" fontSize="9" fill="#5B6A3A">Augmented LLM (L5)</text>
          <text x="200" y="228" fontFamily="var(--mono)" fontSize="9" fill="#5B6A3A">Evaluator-Optimizer (L6)</text>
          <text x="400" y="148" fontFamily="var(--mono)" fontSize="9" fill="#5B6A3A">HITL checkpoint (L7)</text>
          <text x="600" y="228" fontFamily="var(--mono)" fontSize="9" fill="#4A6378">Orchestrator → sub-agent (L6)</text>
        </g>
      </svg>
    </div>
  );
}

function AugmentedLLM() {
  return (
    <div className="diagram">
      <div className="diagram-title">Building block — the augmented LLM</div>
      <svg viewBox="0 0 720 240" width="100%" style={{ display: "block" }}>
        <g fontFamily="var(--mono)" fontSize="11" fill="#3B3A36">
          <rect x="280" y="80" width="160" height="80" rx="12" fill="#1F1E1B" />
          <text x="360" y="115" fill="#F0EBDF" textAnchor="middle" fontSize="12" fontFamily="var(--sans)" fontWeight="500">LLM</text>
          <text x="360" y="135" fill="#DED3BC" textAnchor="middle" fontSize="10">claude-sonnet-4-5</text>

          <rect x="40" y="40" width="140" height="44" rx="8" fill="#F0EBDF" stroke="#1F1E1B" strokeOpacity="0.22" />
          <text x="110" y="58" textAnchor="middle">RETRIEVAL</text>
          <text x="110" y="74" textAnchor="middle" fill="#6B6A63">(your data, docs)</text>

          <rect x="40" y="156" width="140" height="44" rx="8" fill="#F0EBDF" stroke="#1F1E1B" strokeOpacity="0.22" />
          <text x="110" y="174" textAnchor="middle">MEMORY</text>
          <text x="110" y="190" textAnchor="middle" fill="#6B6A63">(state, history)</text>

          <rect x="540" y="98" width="140" height="44" rx="8" fill="#F0EBDF" stroke="#1F1E1B" strokeOpacity="0.22" />
          <text x="610" y="116" textAnchor="middle">TOOLS</text>
          <text x="610" y="132" textAnchor="middle" fill="#6B6A63">(MCP, APIs, fns)</text>

          <path className="arrow" d="M180 62 Q 230 62 280 100" />
          <path className="arrow" d="M180 178 Q 230 178 280 140" />
          <path className="arrow" d="M440 120 L 540 120" />
          <path className="arrow dim" d="M540 130 Q 480 200 360 200 Q 240 200 180 178" />
        </g>
      </svg>
    </div>
  );
}

function PromptChain() {
  return (
    <div className="diagram">
      <div className="diagram-title">Workflow — Prompt chaining</div>
      <svg viewBox="0 0 720 140" width="100%">
        <g fontFamily="var(--sans)" fontSize="11">
          {[0,1,2,3].map((i) => (
            <g key={i}>
              <rect x={20 + i*180} y="40" width="140" height="60" rx="10" fill={i===0?"#1F1E1B":"#F0EBDF"} stroke="#1F1E1B" strokeOpacity="0.22" />
              <text x={90 + i*180} y="68" textAnchor="middle" fill={i===0?"#F0EBDF":"#1F1E1B"} fontWeight="500">Step {i+1}</text>
              <text x={90 + i*180} y="86" textAnchor="middle" fill={i===0?"#DED3BC":"#6B6A63"} fontSize="10" fontFamily="var(--mono)">
                {["extract","outline","draft","polish"][i]}
              </text>
              {i<3 && <path className="arrow" d={`M${160+i*180} 70 L ${200+i*180} 70`} markerEnd="url(#arr)" />}
            </g>
          ))}
          <defs>
            <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L10,5 L0,10 Z" fill="#3B3A36" />
            </marker>
          </defs>
        </g>
      </svg>
    </div>
  );
}

function RouterPattern() {
  return (
    <div className="diagram">
      <div className="diagram-title">Workflow — Routing</div>
      <svg viewBox="0 0 720 200" width="100%">
        <g fontFamily="var(--sans)" fontSize="11">
          <rect x="40" y="80" width="140" height="50" rx="10" fill="#1F1E1B" />
          <text x="110" y="103" textAnchor="middle" fill="#F0EBDF" fontWeight="500">Router LLM</text>
          <text x="110" y="118" textAnchor="middle" fill="#DED3BC" fontSize="10" fontFamily="var(--mono)">classify intent</text>

          {["FAQ", "Refund", "Tech support", "Escalate to human"].map((label, i) => (
            <g key={i}>
              <rect x="380" y={20 + i*42} width="220" height="32" rx="8" fill="#F0EBDF" stroke="#1F1E1B" strokeOpacity="0.22" />
              <text x="396" y={40 + i*42} fontFamily="var(--mono)" fontSize="11" fill="#6B6A63">→</text>
              <text x="416" y={40 + i*42}>{label}</text>
              <path className="arrow dim" d={`M180 105 Q 280 105 380 ${36 + i*42}`} />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

function Parallelization() {
  return (
    <div className="diagram">
      <div className="diagram-title">Workflow — Parallelization (vote / sectioning)</div>
      <svg viewBox="0 0 720 200" width="100%">
        <g fontFamily="var(--sans)" fontSize="11">
          <rect x="40" y="80" width="120" height="40" rx="8" fill="#1F1E1B" />
          <text x="100" y="105" textAnchor="middle" fill="#F0EBDF">Input</text>
          {[0,1,2].map((i) => (
            <g key={i}>
              <rect x="280" y={20+i*60} width="160" height="40" rx="8" fill="#F0EBDF" stroke="#1F1E1B" strokeOpacity="0.22" />
              <text x="360" y={45+i*60} textAnchor="middle">LLM call {i+1}</text>
              <path className="arrow" d={`M160 100 Q 220 100 280 ${40+i*60}`} />
              <path className="arrow" d={`M440 ${40+i*60} Q 500 ${40+i*60} 560 100`} />
            </g>
          ))}
          <rect x="560" y="80" width="120" height="40" rx="8" fill="#1F1E1B" />
          <text x="620" y="105" textAnchor="middle" fill="#F0EBDF">Aggregate</text>
        </g>
      </svg>
    </div>
  );
}

function Orchestrator() {
  return (
    <div className="diagram">
      <div className="diagram-title">Workflow — Orchestrator + workers (sub-agents)</div>
      <svg viewBox="0 0 720 220" width="100%">
        <g fontFamily="var(--sans)" fontSize="11">
          <rect x="280" y="20" width="160" height="50" rx="10" fill="#1F1E1B" />
          <text x="360" y="42" textAnchor="middle" fill="#F0EBDF" fontWeight="500">Lead agent</text>
          <text x="360" y="58" textAnchor="middle" fill="#DED3BC" fontSize="10" fontFamily="var(--mono)">plans + delegates</text>

          {["Researcher", "Writer", "Reviewer"].map((label, i) => (
            <g key={i}>
              <rect x={60 + i*230} y="130" width="160" height="50" rx="10" fill="#F0EBDF" stroke="#1F1E1B" strokeOpacity="0.22" />
              <text x={140 + i*230} y="152" textAnchor="middle" fontWeight="500">{label}</text>
              <text x={140 + i*230} y="168" textAnchor="middle" fill="#6B6A63" fontSize="10" fontFamily="var(--mono)">sub-agent</text>
              <path className="arrow" d={`M360 70 Q 360 100 ${140 + i*230} 130`} />
              <path className="arrow dim" d={`M${140 + i*230} 130 Q 360 110 360 70`} />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

function EvaluatorOptimizer() {
  return (
    <div className="diagram">
      <div className="diagram-title">Workflow — Evaluator / Optimizer loop</div>
      <svg viewBox="0 0 720 160" width="100%">
        <g fontFamily="var(--sans)" fontSize="11">
          <rect x="80" y="55" width="160" height="50" rx="10" fill="#1F1E1B" />
          <text x="160" y="77" textAnchor="middle" fill="#F0EBDF" fontWeight="500">Generator</text>
          <text x="160" y="93" textAnchor="middle" fill="#DED3BC" fontSize="10" fontFamily="var(--mono)">drafts an answer</text>

          <rect x="480" y="55" width="160" height="50" rx="10" fill="#F0EBDF" stroke="#1F1E1B" strokeOpacity="0.22" />
          <text x="560" y="77" textAnchor="middle" fontWeight="500">Evaluator</text>
          <text x="560" y="93" textAnchor="middle" fill="#6B6A63" fontSize="10" fontFamily="var(--mono)">grades + critiques</text>

          <path className="arrow" d="M240 80 L 480 80" />
          <path className="arrow dim" d="M480 95 Q 360 140 240 95" />
          <text x="360" y="40" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="#6B6A63">draft</text>
          <text x="360" y="135" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="#6B6A63">feedback ↻</text>
        </g>
      </svg>
    </div>
  );
}

function AgentLoop() {
  return (
    <div className="diagram">
      <div className="diagram-title">Agent — autonomous tool-use loop</div>
      <svg viewBox="0 0 720 240" width="100%">
        <g fontFamily="var(--sans)" fontSize="11">
          {/* 1. Edges behind everything */}
          {[
            { x: 90, y: 50 },
            { x: 90, y: 190 },
            { x: 560, y: 50 },
            { x: 560, y: 190 },
          ].map((t, i) => (
            <path key={i} className="arrow dim" d={`M${t.x + 60} ${t.y} Q ${(t.x + 360)/2} ${(t.y + 120)/2 - 20} 360 120`} />
          ))}
          {/* 2. Center node on top of edges */}
          <circle cx="360" cy="120" r="66" fill="#1F1E1B" />
          <text x="360" y="116" textAnchor="middle" fill="#F0EBDF" fontWeight="500">Agent</text>
          <text x="360" y="132" textAnchor="middle" fill="#DED3BC" fontSize="10" fontFamily="var(--mono)">think → act → observe</text>
          {/* 3. Outer tool nodes on top of edges */}
          {[
            { x: 90, y: 50, label: "Read file" },
            { x: 90, y: 190, label: "Run command" },
            { x: 560, y: 50, label: "Edit file" },
            { x: 560, y: 190, label: "Search web" },
          ].map((t, i) => (
            <g key={i}>
              <rect x={t.x} y={t.y - 18} width="120" height="36" rx="8" fill="#F0EBDF" stroke="#1F1E1B" strokeOpacity="0.22" />
              <text x={t.x + 60} y={t.y + 4} textAnchor="middle" fontFamily="var(--mono)" fontSize="11">{t.label}</text>
            </g>
          ))}
          <text x="360" y="220" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="#6B6A63">loops until goal met or stop signal</text>
        </g>
      </svg>
    </div>
  );
}

function MCPBus() {
  return (
    <div className="diagram">
      <div className="diagram-title">MCP — one protocol, many tools</div>
      <svg viewBox="0 0 720 260" width="100%">
        <g fontFamily="var(--sans)" fontSize="11">
          <rect x="280" y="20" width="160" height="50" rx="10" fill="#1F1E1B" />
          <text x="360" y="43" textAnchor="middle" fill="#F0EBDF" fontWeight="500">Claude (host)</text>
          <text x="360" y="58" textAnchor="middle" fill="#DED3BC" fontSize="10" fontFamily="var(--mono)">Desktop / Code</text>

          <rect x="100" y="110" width="520" height="38" rx="6" fill="#DED3BC" />
          <text x="360" y="134" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="#3B3A36">MCP — Model Context Protocol</text>

          {["Figma", "GitHub", "Vercel", "PostHog", "Clarity"].map((s, i) => (
            <g key={i}>
              <rect x={40 + i*135} y="180" width="110" height="50" rx="10" fill="#F0EBDF" stroke="#1F1E1B" strokeOpacity="0.22" />
              <text x={95 + i*135} y="201" textAnchor="middle" fontWeight="500">{s}</text>
              <text x={95 + i*135} y="217" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="#6B6A63">MCP server</text>
              <path className="arrow" d={`M${95 + i*135} 180 L ${95 + i*135} 148`} />
            </g>
          ))}
          <path className="arrow" d="M360 70 L 360 110" />
        </g>
      </svg>
    </div>
  );
}

// ---------- Hero card ----------
function HeroCard({ eyebrow, title, lede, meta }) {
  return (
    <div className="hero-card">
      <div className="eyebrow">{eyebrow}</div>
      <h1 style={{ marginTop: 14 }}>{title}</h1>
      {lede && <p className="lede">{lede}</p>}
      {meta && (
        <div className="meta-row">
          {meta.map((m, i) => <span key={i}>{m}</span>)}
        </div>
      )}
    </div>
  );
}

// ---------- Auth button (optional Google sign-in) ----------
function AuthButton({ user }) {
  const [busy, setBusy] = useState(false);

  if (!window.__supabase) return null;

  const signIn = async () => {
    setBusy(true);
    try {
      await window.__supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
    } catch { setBusy(false); }
  };

  const signOut = async () => {
    setBusy(true);
    try { await window.__supabase.auth.signOut(); } finally { setBusy(false); }
  };

  if (user) {
    const name  = user.user_metadata?.full_name || user.email || "You";
    const avatar = user.user_metadata?.avatar_url;
    return (
      <button
        className="btn auth-btn auth-btn--signed-in"
        onClick={signOut}
        disabled={busy}
        title={`Signed in as ${name} · Click to sign out`}
      >
        {avatar
          ? <img src={avatar} alt="" className="auth-avatar" referrerPolicy="no-referrer" />
          : <span className="auth-initials">{name[0].toUpperCase()}</span>
        }
        <span className="auth-name">{name.split(" ")[0]}</span>
        <span className="auth-sync-dot" title="Progress synced" />
      </button>
    );
  }

  return (
    <button
      className="btn auth-btn"
      onClick={signIn}
      disabled={busy}
      title="Sign in to sync progress across devices"
    >
      <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.79-.15-1.18Z" fill="#4285F4"/>
        <path d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.76-2.7.76-2.07 0-3.83-1.4-4.46-3.28H1.86v2.07A8 8 0 0 0 8.98 17Z" fill="#34A853"/>
        <path d="M4.52 10.53a4.8 4.8 0 0 1 0-3.06V5.4H1.86a8 8 0 0 0 0 7.2l2.66-2.07Z" fill="#FBBC05"/>
        <path d="M8.98 4.19c1.17 0 2.22.4 3.04 1.19l2.28-2.28A8 8 0 0 0 1.86 5.4L4.52 7.47c.63-1.88 2.39-3.28 4.46-3.28Z" fill="#EA4335"/>
      </svg>
      {busy ? "Signing in…" : "Sign in"}
    </button>
  );
}

// ---------- Tier system (single tier for now; extend by adding entries) ----------
const TIERS = [
  { label: "Builder", minPoints: 0, icon: "◆" },
];
function getTier(points) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (points >= TIERS[i].minPoints) return TIERS[i];
  }
  return TIERS[0];
}

// ---------- Profile block (sidebar) ----------
function ProfileBlock({ user, points, onViewLeaderboard, onSignOut }) {
  const [leaderboard, setLeaderboard] = React.useState([]);
  const [myRank, setMyRank]           = React.useState(null);
  const tier   = getTier(points);
  const name   = user?.user_metadata?.full_name || user?.email?.split("@")[0] || null;
  const avatar = user?.user_metadata?.avatar_url;

  React.useEffect(() => {
    if (!window.__supabase) return;
    window.__supabase.rpc("get_leaderboard", { limit_n: 5 })
      .then(({ data }) => {
        if (!data) return;
        setLeaderboard(data);
        const me = data.find(r => r.is_current_user);
        if (me) setMyRank(me.rank);
      })
      .catch(() => {});
  }, [user?.id, points]);

  const top3    = leaderboard.slice(0, 3);
  const meRow   = leaderboard.find(r => r.is_current_user);
  const showMe  = myRank > 3 && meRow;

  return (
    <div className="profile-block">
      <div className="profile-identity">
        <div className="profile-avatar">
          {avatar
            ? <img src={avatar} alt="" className="profile-avatar-img" />
            : <span className="profile-avatar-initials">{name ? name[0].toUpperCase() : "?"}</span>
          }
        </div>
        <div className="profile-meta">
          <div className="profile-name">{name || "Guest"}</div>
          <div className="profile-tier">
            <span className="profile-tier-icon">{tier.icon}</span>
            <span>{tier.label}</span>
          </div>
        </div>
        <div className="profile-pts">
          <div className="profile-pts-value">{points}</div>
          <div className="profile-pts-label">pts</div>
        </div>
        {user && onSignOut && (
          <button className="profile-signout" onClick={onSignOut} title="Sign out">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        )}
      </div>

      <div className="mini-leaderboard">
        {leaderboard.length === 0 ? (
          <div className="mini-lb-empty">
            {!window.__supabase ? "No leaderboard" : "No scores yet"}
          </div>
        ) : (
          <>
            {top3.map(row => (
              <div key={row.rank} className={"mini-lb-row" + (row.is_current_user ? " mini-lb-me" : "")}>
                <span className="mini-lb-rank">#{row.rank}</span>
                <span className="mini-lb-name">{row.display_name}</span>
                <span className="mini-lb-score">{row.points}</span>
              </div>
            ))}
            {showMe && (
              <>
                <div className="mini-lb-ellipsis">···</div>
                <div className="mini-lb-row mini-lb-me">
                  <span className="mini-lb-rank">#{meRow.rank}</span>
                  <span className="mini-lb-name">{meRow.display_name}</span>
                  <span className="mini-lb-score">{meRow.points}</span>
                </div>
              </>
            )}
          </>
        )}
        {!user && window.__supabase && (
          <div className="mini-lb-signin">Sign in to appear here</div>
        )}
      </div>

      <button className="mini-lb-link btn btn-ghost" onClick={onViewLeaderboard}>
        Full leaderboard →
      </button>
    </div>
  );
}

// ---------- Leaderboard page ----------
function LeaderboardPage({ user, onBack }) {
  const [rows,    setRows]    = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!window.__supabase) { setLoading(false); return; }
    window.__supabase.rpc("get_leaderboard", { limit_n: 50 })
      .then(({ data }) => { setRows(data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user?.id]);

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-inner">
        <div className="leaderboard-head">
          <button className="btn btn-ghost" onClick={onBack}>← Back</button>
          <h2 style={{ margin: 0 }}>Leaderboard</h2>
        </div>

        {loading ? (
          <div className="lb-empty">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="lb-empty">
            {!window.__supabase ? "Auth not configured." : "No scores yet — complete a quiz to appear here!"}
          </div>
        ) : (
          <div className="lb-list">
            {rows.map(row => (
              <div key={row.rank} className={"lb-row" + (row.is_current_user ? " lb-row--me" : "")}>
                <span className="lb-rank">
                  {row.rank <= 3
                    ? ["◆", "◈", "◇"][row.rank - 1]
                    : `#${row.rank}`}
                </span>
                <span className="lb-name">{row.display_name}</span>
                <span className="lb-score">{row.points} pts</span>
              </div>
            ))}
          </div>
        )}

        {!user && window.__supabase && (
          <div className="lb-signin-nudge">
            <p>Sign in with Google to save your score and appear here.</p>
            <AuthButton user={user} />
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, {
  CodeBlock, CodeTabs, Callout, Quiz, QuizTiered, Terminal, ChatMock, TryIt, Steps,
  AgentDiagram, HeroCard, useInView, CourseOrchestrator, AuthButton,
  ProfileBlock, LeaderboardPage,
});
