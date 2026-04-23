import html as _html


def _e(s) -> str:
    return _html.escape(str(s) if s is not None else "")


def _tag_items(items: list, highlighted: list) -> str:
    hl = set(highlighted or [])
    parts = []
    for item in (items or []):
        cls = "sb-tag hi" if item in hl else "sb-tag"
        parts.append(f'<span class="{cls}">{_e(item)}</span>')
    return "\n        ".join(parts)


RESUME_CSS = """\
* { margin:0; padding:0; box-sizing:border-box; }
body { background:#0e0e0e; padding:48px 24px; font-family:'DM Sans',sans-serif; }
.wrap { max-width:860px; margin:0 auto; }
.label { margin-bottom:20px; }
.label h2 { font-family:'DM Sans',sans-serif; font-size:11px; letter-spacing:.2em; text-transform:uppercase; color:#555; }
.print-btn { display:block; margin:0 auto 24px auto; padding:10px 28px; background:#2A7F7F; color:#fff; border:none; font-family:'DM Sans',sans-serif; font-size:12px; letter-spacing:.12em; text-transform:uppercase; cursor:pointer; max-width:860px; text-align:center; }
.print-btn:hover { background:#1f6060; }
@media print {
  @page { size: letter; margin: 0; }
  html, body { background:#fff !important; padding:0 !important; margin:0 !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
  .print-btn { display:none !important; }
  .label { display:none !important; }
  .wrap { max-width:100% !important; margin:0 !important; }
  .resume { box-shadow:none !important; width:100% !important; min-height:100vh !important; }
  .sb { background:#0D0F14 !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
  .sb-name { color:#fff !important; }
  .sb-role { color:#2A7F7F !important; }
  .sb-contact { color:#777 !important; }
  .sb-section { color:#2A7F7F !important; }
  .sb-comp { color:#ccc !important; border-left-color:rgba(42,127,127,.3) !important; }
  .sb-tag { color:#555 !important; border-color:#1e2028 !important; }
  .sb-tag.hi { color:#2A7F7F !important; border-color:rgba(42,127,127,.3) !important; }
  .fw-box { background:#F9FAFA !important; border-left-color:#2A7F7F !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
  .stitle { border-bottom-color:#2A7F7F !important; }
  .fw-num { color:#2A7F7F !important; }
  .ach-group-title { color:#2A7F7F !important; }
  .ach::before { background:#2A7F7F !important; }
  .exp-co { color:#2A7F7F !important; }
}
:root { --ac:#2A7F7F; --ac-dim:rgba(42,127,127,.3); --ac-faint:rgba(42,127,127,.12); }
.resume { background:#fff; display:grid; grid-template-columns:232px 1fr; min-height:1080px; box-shadow:0 40px 100px rgba(0,0,0,.7); }
.sb { background:#0D0F14; padding:44px 26px; display:flex; flex-direction:column; }
.sb-name { font-family:'Unbounded',sans-serif; font-size:19px; font-weight:700; line-height:1.4; letter-spacing:.02em; color:#fff; margin-bottom:6px; }
.sb-role { font-family:'DM Sans',sans-serif; font-size:9px; letter-spacing:.18em; text-transform:uppercase; color:var(--ac); padding-bottom:24px; border-bottom:1px solid rgba(255,255,255,.07); margin-bottom:22px; }
.sb-contact { font-size:10.5px; color:#777; line-height:1.95; margin-bottom:4px; }
.sb-section { font-size:8px; letter-spacing:.2em; text-transform:uppercase; color:var(--ac); margin-top:24px; margin-bottom:10px; }
.sb-comp { font-size:10.5px; color:#ccc; line-height:1.5; margin-bottom:5px; padding-left:9px; border-left:2px solid var(--ac-dim); }
.sb-tags { display:flex; flex-wrap:wrap; gap:3px; margin-top:2px; }
.sb-tag { font-size:8.5px; color:#555; border:1px solid #1e2028; padding:3px 6px; line-height:1.4; }
.sb-tag.hi { border-color:var(--ac-dim); color:var(--ac); }
.main { padding:44px 42px; background:#fff; color:#111; }
.section { margin-bottom:30px; }
.stitle { font-size:8px; letter-spacing:.22em; text-transform:uppercase; color:#bbb; display:inline-block; padding-bottom:8px; border-bottom:2px solid var(--ac); margin-bottom:16px; }
.fw-box { background:#F9FAFA; border-left:3px solid var(--ac); padding:16px 18px; }
.fw-intro { font-size:12px; line-height:1.75; color:#444; margin-bottom:16px; }
.fw-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.fw-num { font-family:'DM Mono',monospace; font-size:8px; color:var(--ac); margin-bottom:2px; }
.fw-title { font-size:10px; font-weight:600; color:#111; margin-bottom:2px; }
.fw-body { font-size:10px; color:#888; line-height:1.6; }
.ach-group { margin-bottom:16px; }
.ach-group-title { font-size:8.5px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:var(--ac); margin-bottom:7px; }
.ach { font-size:11.5px; color:#444; line-height:1.65; margin-bottom:4px; padding-left:14px; position:relative; }
.ach::before { content:''; position:absolute; left:0; top:8px; width:6px; height:1px; background:var(--ac); }
.m { color:#111; font-weight:600; }
.exp-item { display:grid; grid-template-columns:1fr auto; gap:8px; padding:11px 0; border-bottom:1px solid #f2f2f2; }
.exp-item:last-child { border-bottom:none; }
.exp-title { font-family:'DM Sans',sans-serif; font-size:13px; font-weight:600; color:#111; margin-bottom:2px; }
.exp-co { font-size:10px; color:var(--ac); font-weight:500; }
.exp-date { font-size:9.5px; color:#bbb; text-align:right; padding-top:2px; white-space:nowrap; }
"""


def _ach_text(raw: str) -> str:
    """Convert [[metric]] markers to <span class="m"> for bold metrics."""
    import re
    return re.sub(r'\[\[(.+?)\]\]', r'<span class="m">\1</span>', _e(raw))


def render_resume_html(d: dict, job_title: str, company: str) -> str:
    name_parts = (d.get("name") or "").split(" ", 1)
    name_line1 = _e(name_parts[0]) if name_parts else ""
    name_line2 = _e(name_parts[1]) if len(name_parts) > 1 else ""

    comps_html = "\n".join(
        f'      <div class="sb-comp">{_e(c)}</div>'
        for c in (d.get("competencies") or [])
    )

    tech_tags = _tag_items(d.get("tech_stack", []), d.get("highlighted_tech", []))
    ai_tags = _tag_items(d.get("ai_tools", []), d.get("highlighted_ai", []))
    cert_tags = _tag_items(d.get("certifications", []), d.get("certifications", []))

    fw_items_html = ""
    for item in (d.get("framework_items") or []):
        fw_items_html += (
            f'\n            <div class="fw-item">'
            f'\n              <div class="fw-num">{_e(item.get("num", ""))}</div>'
            f'\n              <div class="fw-title">{_e(item.get("title", ""))}</div>'
            f'\n              <div class="fw-body">{_e(item.get("body", ""))}</div>'
            f'\n            </div>'
        )

    ach_groups_html = ""
    for grp in (d.get("achievement_groups") or []):
        items_html = "\n".join(
            f'        <div class="ach">{_ach_text(item)}</div>'
            for item in (grp.get("items") or [])
        )
        ach_groups_html += (
            f'\n      <div class="ach-group">'
            f'\n        <div class="ach-group-title">{_e(grp.get("title", ""))}</div>'
            f'\n{items_html}'
            f'\n      </div>'
        )

    exp_html = ""
    for exp in (d.get("experience") or []):
        exp_html += (
            f'\n      <div class="exp-item">'
            f'\n        <div>'
            f'\n          <div class="exp-title">{_e(exp.get("title", ""))}</div>'
            f'\n          <div class="exp-co">{_e(exp.get("company", ""))}</div>'
            f'\n        </div>'
            f'\n        <div class="exp-date">{_e(exp.get("dates", ""))}</div>'
            f'\n      </div>'
        )

    education_html = _e(d.get("education", "")).replace("\n", "<br>")
    board_html = _e(d.get("board", "")).replace("\n", "<br>") if d.get("board") else ""
    board_block = f'<div class="sb-contact" style="margin-top:10px;">{board_html}</div>' if board_html else ""

    page_title = f"{_e(d.get('name', 'Resume'))} — {_e(job_title)} at {_e(company)}"
    label_text = f"Executive Signal · Deep Teal — {_e(job_title)} at {_e(company)}"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{page_title}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@400;700;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap');</style>
<style>{RESUME_CSS}</style>
</head>
<body>
<div class="wrap">
  <button class="print-btn" onclick="window.print()">Save as PDF &mdash; File &rsaquo; Print &rsaquo; Save as PDF</button>
  <div class="label"><h2>{label_text}</h2></div>
  <div class="resume">

    <div class="sb">
      <div class="sb-name">{name_line1}<br>{name_line2}</div>
      <div class="sb-role">{_e(d.get("tagline", ""))}</div>
      <div class="sb-contact">
        {_e(d.get("location", ""))}<br>
        {_e(d.get("phone", ""))}<br>
        {_e(d.get("email", ""))}<br>
        {_e(d.get("linkedin", ""))}
      </div>

      <div class="sb-section">Core Competencies</div>
{comps_html}

      <div class="sb-section">Martech Stack</div>
      <div class="sb-tags">
        {tech_tags}
      </div>

      <div class="sb-section">AI &amp; Automation</div>
      <div class="sb-tags">
        {ai_tags}
      </div>

      <div class="sb-section">Education</div>
      <div class="sb-contact">{education_html}</div>
      <div class="sb-tags" style="margin-top:8px;">
        {cert_tags}
      </div>
      {board_block}
    </div>

    <div class="main">
      <div class="section">
        <div class="stitle">The Work I Do</div>
        <div class="fw-box">
          <div class="fw-intro">{_e(d.get("intro_paragraph", ""))}</div>
          <div class="fw-grid">{fw_items_html}
          </div>
        </div>
      </div>

      <div class="section">
        <div class="stitle">Selected Achievements</div>
{ach_groups_html}
      </div>

      <div class="section">
        <div class="stitle">Experience</div>
{exp_html}
      </div>
    </div>

  </div>
</div>
</body>
</html>"""
