import json
import os
import glob

def merge():
    out_dir = "graphify-out"
    
    # 1. Load AST
    ast_path = os.path.join(out_dir, ".graphify_ast.json")
    with open(ast_path, "r") as f:
        master = json.load(f)
    
    if "nodes" not in master: master["nodes"] = []
    if "edges" not in master: master["edges"] = []
    if "hyperedges" not in master: master["hyperedges"] = []

    # 2. Load Semantic Chunks
    chunk_files = glob.glob(os.path.join(out_dir, ".graphify_chunk_*.json"))
    
    for cf in chunk_files:
        with open(cf, "r") as f:
            chunk = json.load(f)
            
            # Merge nodes (avoid duplicates by ID)
            existing_node_ids = {n["id"] for n in master["nodes"]}
            for n in chunk.get("nodes", []):
                if n["id"] not in existing_node_ids:
                    master["nodes"].append(n)
                    existing_node_ids.add(n["id"])
            
            # Merge edges
            master["edges"].extend(chunk.get("edges", []))
            
            # Merge hyperedges
            master["hyperedges"].extend(chunk.get("hyperedges", []))

    # 3. Save merged results
    extract_path = os.path.join(out_dir, ".graphify_extract.json")
    with open(extract_path, "w") as f:
        json.dump(master, f, indent=2)
    
    print(f"Merged {len(chunk_files)} chunks into {extract_path}")
    print(f"Total Nodes: {len(master['nodes'])}")
    print(f"Total Edges: {len(master['edges'])}")
    print(f"Total Hyperedges: {len(master['hyperedges'])}")

if __name__ == "__main__":
    merge()
