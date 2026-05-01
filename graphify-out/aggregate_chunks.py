import json
from pathlib import Path

def aggregate_chunks():
    uncached_path = Path('graphify-out/.graphify_uncached.txt')
    if not uncached_path.exists():
        return
    
    files = uncached_path.read_text(encoding='utf-8').splitlines()
    
    # Chunk 1: 0-24
    # Chunk 2: 25-48
    # Chunk 3: 49-51 (docs)
    # Chunk 4+: images
    
    chunks = [
        files[0:25],
        files[25:49],
        files[49:52],
    ]
    # Images
    for f in files[52:]:
        chunks.append([f])
        
    for i, chunk in enumerate(chunks):
        content = []
        for f in chunk:
            p = Path(f)
            if p.exists():
                try:
                    text = p.read_text(encoding='utf-8')
                    content.append(f"--- FILE: {f} ---\n{text}\n")
                except Exception as e:
                    content.append(f"--- FILE: {f} ---\n[Error reading file: {e}]\n")
        
        Path(f'graphify-out/chunk_{i+1}_raw.txt').write_text('\n'.join(content), encoding='utf-8')

if __name__ == "__main__":
    aggregate_chunks()
