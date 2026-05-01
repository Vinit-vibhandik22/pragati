import json
import os

def build():
    out_dir = "graphify-out"
    extract_path = os.path.join(out_dir, ".graphify_extract.json")
    
    with open(extract_path, "r") as f:
        data = json.load(f)
    
    nodes = data.get("nodes", [])
    edges = data.get("edges", [])
    hyperedges = data.get("hyperedges", [])
    
    # 1. Community Labeling (Simple heuristic)
    communities = {
        "API & Logic": [],
        "Frontend & UI": [],
        "Infrastructure & Auth": [],
        "Documentation & Assets": [],
        "Utilities & Libs": []
    }
    
    for n in nodes:
        source_file = n.get("source_file", "")
        if "app/api" in source_file:
            communities["API & Logic"].append(n)
        elif "app/" in source_file and "api" not in source_file:
            communities["Frontend & UI"].append(n)
        elif "lib/supabase" in source_file or "middleware" in source_file:
            communities["Infrastructure & Auth"].append(n)
        elif "lib/" in source_file:
            communities["Utilities & Libs"].append(n)
        elif source_file.endswith(".md") or "public/" in source_file:
            communities["Documentation & Assets"].append(n)
        else:
            communities["Utilities & Libs"].append(n)

    # 2. Generate GRAPH_REPORT.md
    report_path = "GRAPH_REPORT.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# PRAGATI Knowledge Graph Report\n\n")
        f.write(f"**Generated**: 2026-04-30\n")
        f.write(f"**Total Nodes**: {len(nodes)}\n")
        f.write(f"**Total Edges**: {len(edges)}\n")
        f.write(f"**Total Hyperedges**: {len(hyperedges)}\n\n")
        
        f.write("## 🏗 Architecture Overview\n")
        f.write("PRAGATI is a Next.js application built for the Maharashtra Agriculture Office. It uses a multi-LLM strategy (Claude + Gemini) to process farmer grievances, classify documents, and detect fraud.\n\n")
        
        f.write("## 🏘 Communities\n")
        for comm, c_nodes in communities.items():
            if c_nodes:
                f.write(f"### {comm} ({len(c_nodes)} nodes)\n")
                f.write(", ".join([f"`{n['label']}`" for n in c_nodes[:10]]))
                if len(c_nodes) > 10: f.write(" ...")
                f.write("\n\n")
        
        f.write("## 🔄 Critical Flows\n")
        for he in hyperedges:
            f.write(f"- **{he['label']}**: Connects {', '.join(he['nodes'])}\n")
        
        f.write("\n## 📊 Dependency Diagram\n")
        f.write("```mermaid\ngraph TD\n")
        # Show only top 20 edges for readability in MD
        for e in edges[:20]:
            f.write(f"  {e['source']} -->|{e['relation']}| {e['target']}\n")
        f.write("```\n")

    # 3. Generate HTML Visualization (Simplified)
    html_path = os.path.join(out_dir, "graph_viz.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(f"""<!DOCTYPE html>
<html>
<head>
    <title>PRAGATI Graph Viz</title>
    <script src="https://unpkg.com/force-graph"></script>
    <style> body {{ margin: 0; background: #012d1d; color: white; font-family: sans-serif; }} #graph {{ width: 100vw; height: 100vh; }} </style>
</head>
<body>
    <div id="graph"></div>
    <script>
        const gData = {{
            nodes: {json.dumps([{"id": n["id"], "name": n["label"], "val": 1} for n in nodes])},
            links: {json.dumps([{"source": e["source"], "target": e["target"]} for e in edges])}
        }};
        ForceGraph()(document.getElementById('graph'))
            .graphData(gData)
            .nodeLabel('name')
            .nodeAutoColorBy('id')
            .linkDirectionalArrowLength(3.5)
            .linkDirectionalArrowRelPos(1);
    </script>
</body>
</html>""")

    print(f"Graph built successfully!")
    print(f"Report: {report_path}")
    print(f"Visualization: {html_path}")

if __name__ == "__main__":
    build()
