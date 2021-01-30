import React from 'react';
import { useSteps } from 'mdx-deck';
import createGraph from 'ngraph.graph';
import createLayout from 'ngraph.forcelayout';
import './animation.css';

function makeGraph(links) {
    console.log('makeGraph', links);
    let g = createGraph();
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

    return [g, layout];
}

export function animateLayers(g, start, color, target, targetColor) {
    let steps = [];
    let nextQueue = [start];
    let visited = new Set();
    visited.add(start);
    while (nextQueue.length && !visited.has(target)) {
        let currentQueue = nextQueue;
        let currentStep = [];
        nextQueue = [];
        while (currentQueue.length) {
            const node = currentQueue.pop();
            g.forEachLinkedNode(node, (a, L) => {
                a = a.id;
                if (!visited.has(a)) {
                    visited.add(a);
                    nextQueue.push(a);
                    currentStep.push([a === target ? targetColor : color, a]);
                }

                if (!visited.has([node, a]) && !visited.has([a, node])) {
                    visited.add([node, a]);
                    currentStep.push([color, node, a]);
                }
            });
        }
        steps.push(currentStep);
    }
    return steps;
}

class Graph extends React.Component {
    render() {
        const color = this.props.color || "white";
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
                stroke="none" fill={color} style={{ fontSize: 25 }}
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
                const cls = highlight.length > 3 ? highlight[3] : "highlight";
                elems.push(<line key={a + '-' + b + '-' + color}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    className={cls} stroke={color}
                />);
            }
        }

        let y = 30;
        for (const line of this.props.comment.split("\n")) {
            elems.push(
                <text key={line} textAnchor="end" dominantBaseline="hanging" x={width} y={y}
                stroke="none" fill={color} style={{ fontSize: 30 }}>{line}</text>
            );
            y += 30;
        }

        return <svg fill="none" stroke={color} strokeWidth="3" viewBox={"0 0 " + width + " " + height} width="100%" height="100%">
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="8"
                        refX="9.2" refY="5" orient="auto" stroke="yellow">
                    <polyline points="5 3, 9 5, 5 7" strokeWidth="1" />
                </marker>
            </defs>
            {elems}
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
            color={this.props.color}
            graph={this.props.graph}
            layout={this.props.layout}
            highlight={highlight}
            comment={this.props.comment}
        />;
    }
}

export function Animation(props) {
    const {graph: links, steps: stepFun} = props;
    const [graph, layout] = React.useMemo(() => makeGraph(links), [links]);
    const steps = React.useMemo(() => stepFun(graph), [stepFun, graph]);

    function applySteps(base, steps) {
        for (const step of steps) {
            base = base.concat(step);
        }
        return base;
    }

    const stepTypes = {
        'reset': (step, [base, current, comment]) =>
            [[], step, ""],
        'semireset': (step, [base, current, comment]) =>
            [[], step, comment],
        'add': (step, [base, current, comment]) =>
            [applySteps(base, current), step, comment],
        'replace': (step, [base, current, comment]) =>
            [base, step, comment],
        'setComment': (step, [base, current, _]) => {
            if (step.length > 1) {
                const stepType = stepTypes[step[1]];
                return stepType(step.slice(2), [base, current, step[0]]);
            } else {
                return [applySteps(base, current), [], step[0]];
            }
        }
    };

    let step = useSteps(steps.length - 1);
    if (step > steps.length - 1) step = steps.length - 1;
    let state = [[], [], ''];
    console.log(steps);
    for (let i = 0; i <= step; i++) {
        console.log('Applying step', i);
        const stepType = stepTypes[steps[i][0]];
        state = stepType(steps[i].slice(1), state);
    }

    return <StaggerredHighlights color={props.color} graph={graph} layout={layout}
        baseHighlights={state[0]} highlights={state[1]} comment={state[2]} />
}
