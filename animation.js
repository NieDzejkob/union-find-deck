import React from 'react';
import { useSteps } from 'mdx-deck';
import createGraph from 'ngraph.graph';
import createLayout from 'ngraph.forcelayout';

export let g = createGraph();

const links = [
    [1, 2],
    [2, 3],
    [1, 5],
    [2, 5],
    [3, 4],
    [4, 5],
    [4, 6],
    [3, 9],
    [9, 8],
    [8, 7],
];

let layout = createLayout(g, {springLength: 20});

for (const link of links) {
    g.addLink(link[0], link[1]);
    for (let i = 0; i < 250; i++) {
        layout.step();
    }
}

export function Animation(props) {
    console.log(props);
    //const step = useSteps(3);
    const highlights = [
        // Weźmy sobie jakiś graf
        {},
        // Chcemy wiedzieć, czy między dwoma węzłami istnieje ścieżka. Na przykład,
        // jeśli weźmiemy 1 i 6,
        {1: 'green', 6: 'green'},
        // to możemy przejść między nimi, przez 4 i 5
        {1: 'green', 6: 'green', 5: 'yellow', '1-5': 'yellow', '4-5': 'yellow',
         4: 'yellow', '4-6': 'yellow'},
        {},
        {1: 'green', 9: 'green'},
    ];

    const step = useSteps(highlights.length - 1);
    const highlight = highlights[step];

    const scale = 5;
    let {min_x, min_y, max_x, max_y} = layout.getGraphRect();
    min_x *= scale;
    min_y *= scale;
    max_x *= scale;
    max_y *= scale;
    const radius = 20;
    const border = 30;
    const dx = -min_x + radius + border;
    const dy = -min_y + radius + border;
    const width = max_x - min_x + 2*(radius + border);
    const height = max_y - min_y + 2*(radius + border);

    let nodes = [];
    g.forEachNode(node => {
        let {x, y} = layout.getNodePosition(node.id);
        x *= scale;
        y *= scale;
        let color;
        if (node.id in highlight) {
            color = highlight[node.id];
        } else {
            color = "white";
        }

        nodes.push(<circle stroke={color} key={node.id} cx={x + dx} cy={y + dy} r={radius} />);
        nodes.push(<text key={node.id + "-text"}
            stroke="none" fill="white" style={{ fontSize: 25 }}
            x={x + dx} y={y + dy + 2}
            textAnchor="middle" alignmentBaseline="middle">{node.id}</text>);
    });

    let edges = [];
    g.forEachLink(link => {
        const {from, to} = layout.getLinkPosition(link.id);
        const x1 = from.x * scale;
        const y1 = from.y * scale;
        const x2 = to.x * scale;
        const y2 = to.y * scale;
        const length = Math.hypot(x2 - x1, y2 - y1);
        const dirx = (x2 - x1) / length * (radius + 7);
        const diry = (y2 - y1) / length * (radius + 7);

        const id = link.fromId + '-' + link.toId;
        let color;
        if (id in highlight) {
            color = highlight[id];
        } else {
            color = "white";
        }
        nodes.push(<line key={id}
            x1={x1 + dx + dirx} y1={y1 + dy + diry}
            x2={x2 + dx - dirx} y2={y2 + dy - diry}
            stroke={color}
        />);
    });

    return <svg fill="none" stroke="white" strokeWidth="3" viewBox={"0 0 " + width + " " + height}>
        {nodes}
    </svg>;
}
