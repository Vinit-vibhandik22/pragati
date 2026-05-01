import sys
import json
from graphify.extract import collect_files, extract
from pathlib import Path

def main():
    detect_path = Path('graphify-out/.graphify_detect.json')
    if not detect_path.exists():
        print("Error: .graphify_detect.json not found")
        sys.exit(1)
        
    detect = json.loads(detect_path.read_text(encoding='utf-8'))
    code_files = []
    for f in detect.get('files', {}).get('code', []):
        p = Path(f)
        if p.exists():
            code_files.append(p)
    
    if not code_files:
        print("No code files found.")
        result = {'nodes': [], 'edges': [], 'input_tokens': 0, 'output_tokens': 0}
    else:
        result = extract(code_files, cache_root=Path('.'))
        
    out_path = Path('graphify-out/.graphify_ast.json')
    out_path.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(f"AST: {len(result['nodes'])} nodes, {len(result['edges'])} edges")

if __name__ == "__main__":
    main()
