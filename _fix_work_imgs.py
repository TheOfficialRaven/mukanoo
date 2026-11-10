from pathlib import Path
import re

html_path = Path(r"e:\HTML\Mukanoo\index.html")
text = html_path.read_text(encoding="utf-8")

slide_re = re.compile(
    r'(<div class="work__track">\s*)'
    r'(?:<div class="work__slide"[^>]*>\s*</div>\s*){3}'
    r'(</div>)',
    re.M,
)

n = 0

def repl(match):
    global n
    slides = []
    for _ in range(3):
        n += 1
        src = f"assets/imgs/referenciak/referencia-{n:02d}.webp"
        slides.append(
            f'<div class="work__slide">'
            f'<img src="{src}" alt="Mukanoo kollekció {n}" loading="lazy" decoding="async">'
            f"</div>"
        )
    return match.group(1) + "\n                        ".join(slides) + "\n                      " + match.group(2)

new_text, count = slide_re.subn(repl, text)
html_path.write_text(new_text, encoding="utf-8")
print(f"updated tracks={count}, images={n}")
