import React from 'react';
import { useSteps } from 'mdx-deck';
import createGraph from 'ngraph.graph';
import createLayout from 'ngraph.forcelayout';
import './animation.css';

export let g = createGraph();

const links = [
    [1, 2],
    [2, 3],
    [1, 5],
    [2, 5],
    [3, 4],
    [4, 5],
    [4, 6],
    [3, 9, true],
    [9, 8],
    [8, 7],
];

let layout = createLayout(g, {springLength: 20});
let shadowLinks = [];

for (const link of links) {
    const v = g.addLink(link[0], link[1]);
    if (link[2]) {
        shadowLinks.push(v);
    }

    for (let i = 0; i < 250; i++) {
        layout.step();
    }
}

for (const link of shadowLinks) {
    g.removeLink(link);
}

class Graph extends React.Component {
    render() {
        const layout = this.props.layout;

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

        function getNodePosition(id) {
            const {x, y} = layout.getNodePosition(id);
            return {x: x * scale + dx, y: y * scale + dy};
        }

        function getLinkPosition(a, b) {
            const {x: x1, y: y1} = getNodePosition(a);
            const {x: x2, y: y2} = getNodePosition(b);
            const length = Math.hypot(x2 - x1, y2 - y1);
            const dirx = (x2 - x1) / length * (radius + 7);
            const diry = (y2 - y1) / length * (radius + 7);
            return {x1: x1 + dirx, y1: y1 + diry,
                    x2: x2 - dirx, y2: y2 - diry};
        }

        let elems = [];
        this.props.graph.forEachNode(node => {
            let {x, y} = getNodePosition(node.id);
            elems.push(<circle key={node.id} cx={x} cy={y} r={radius} />);
            elems.push(<text key={node.id + "-text"}
                stroke="none" fill="white" style={{ fontSize: 25 }}
                x={x} y={y + 2}
                textAnchor="middle" alignmentBaseline="middle">{node.id}</text>);
        });

        this.props.graph.forEachLink(link => {
            const {x1, y1, x2, y2} = getLinkPosition(link.fromId, link.toId);

            const id = link.fromId + '-' + link.toId;
            elems.push(<line key={id}
                x1={x1} y1={y1} x2={x2} y2={y2}
            />);
        });

        for (const highlight of this.props.highlight) {
            if (highlight.length === 2) {
                const [color, node] = highlight;
                const {x, y} = getNodePosition(node);
                elems.push(<circle
                    key={node + "-" + color}
                    className="highlight" stroke={color}
                    cx={x} cy={y} r={radius} />);
            } else {
                const [color, a, b] = highlight;
                const {x1, y1, x2, y2} = getLinkPosition(a, b);
                elems.push(<line key={a + '-' + b + '-' + color}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    className="highlight" stroke={color}
                />);
            }
        }

        return <svg fill="none" stroke="white" strokeWidth="3" viewBox={"0 0 " + width + " " + height}>
            {elems}
            <text textAnchor="end" dominantBaseline="hanging" x={width} y="30"
            stroke="none" fill="white" style={{ fontSize: 30 }}>{this.props.comment}</text>
        </svg>;
    }
}

class StaggerredHighlights extends React.Component {
    constructor(props) {
        super(props);
        this.state = {stagesApplied: 0};
        this.timeoutID = null;
    }

    componentWillMount() {
        this.advance();
    }

    componentWillUnmount() {
        if (this.timeoutID) {
            clearTimeout(this.timeoutID);
        }
    }

    componentDidUpdate(prevProps) {
        if (prevProps.highlights !== this.props.highlights) {
            if (this.timeoutID) {
                clearTimeout(this.timeoutID);
            }
            this.setState({stagesApplied: 0});
            this.advance();
        }
    }

    advance() {
        this.setState(st => {
            if (st.stagesApplied < this.props.highlights.length) {
                this.timeoutID = setTimeout(() => this.advance(), 300);
                return {stagesApplied: st.stagesApplied + 1};
            } else {
                return {};
            }
        });
    }

    render() {
        let highlight = this.props.baseHighlights;
        for (let i = 0; i < this.state.stagesApplied; i++) {
            if (i < this.props.highlights.length) {
                highlight = highlight.concat(this.props.highlights[i]);
            }
        }
        return <Graph
            graph={this.props.graph}
            layout={this.props.layout}
            highlight={highlight}
            comment={this.props.comment}
        />;
    }
}

function animateLayers(start, color, target, targetColor) {
    let steps = [];
    let nextQueue = [start];
    let visited = new Set();
    visited.add(start);
    while (nextQueue.length) {
        let currentQueue = nextQueue;
        let currentStep = [];
        nextQueue = [];
        while (currentQueue.length) {
            const node = currentQueue.pop();
            g.forEachLinkedNode(node, (a, L) => {
                a = a.id;
                console.log(a);
                if (!visited.has(a)) {
                    visited.add(a);
                    nextQueue.push(a);
                    currentStep.push([a == target ? targetColor : color, a]);
                }

                if (!visited.has([node, a]) && !visited.has([a, node])) {
                    visited.add([node, a]);
                    currentStep.push([color, node, a]);
                }
            });
        }
        steps.push(currentStep);
    }
    console.log(visited);
    return steps;
}

const steps = [
    // Weźmy sobie jakiś graf
    ['reset'],
    // Chcemy wiedzieć, czy między dwoma węzłami istnieje ścieżka. Na przykład,
    // jeśli weźmiemy 1 i 6,
    ['add', [['green', 1], ['green', 6]]],
    // to możemy przejść między nimi, przez 4 i 5
    ['add',
     [['blue', 1, 5],
      ['blue', 5]],
     [['blue', 5, 4],
      ['blue', 4]],
     [['blue', 4, 6]],
     ],
    // Lecz jeśli weźmiemy sobie 6 i 9, to nie ma między nimi ścieżki.
    ['reset', [['red', 6], ['red', 9]]],
    // Jak możemy odpowiedzieć na to pytanie?
    ['reset'],
    // Moglibyśmy zrobić tak, że weźmiemy jeden z końców...
    ['add', [['green', 1]]],
    // i puścimy wyszukiwanie, w głąb lub wszerz, nie ma znaczania
    ['add'].concat(animateLayers(1, 'blue', 6, 'green')),
    ['setComment', 'O(q(n + k))'],
];

export function Animation(props) {
    function applySteps(base, steps) {
        for (const step of steps) {
            base = base.concat(step);
        }
        return base;
    }

    const stepTypes = {
        'reset': (step, [base, current, comment]) =>
            [[], step, ""],
        'add': (step, [base, current, comment]) =>
            [applySteps(base, current), step, comment],
        'setComment': (step, [base, current, _]) =>
            [applySteps(base, current), [], step[0]],
    };

    const step = useSteps(steps.length - 1);
    let state = [[], [], ''];
    for (let i = 0; i <= step; i++) {
        const stepType = stepTypes[steps[i][0]];
        state = stepType(steps[i].slice(1), state);
    }

    return <StaggerredHighlights graph={g} layout={layout}
        baseHighlights={state[0]} highlights={state[1]} comment={state[2]} />
}
