// http://bl.ocks.org/hollasch/9d3c098022f5524220bd84aae7623478 (MIT)

import * as d3 from 'd3-shape';

var vecFrom = function (p0, p1) {               // Vector from p0 to p1
    return [ p1[0] - p0[0], p1[1] - p0[1] ];
}

var vecScale = function (v, scale) {            // Vector v scaled by 'scale'
    return [ scale * v[0], scale * v[1] ];
}

var vecSum = function (pv1, pv2) {              // The sum of two points/vectors
    return [ pv1[0] + pv2[0], pv1[1] + pv2[1] ];
}

var vecUnit = function (v) {                    // Vector with direction of v and length 1
    var norm = Math.sqrt (v[0]*v[0] + v[1]*v[1]);
    return vecScale (v, 1/norm);
}

var vecScaleTo = function (v, length) {         // Vector with direction of v with specified length
    return vecScale (vecUnit(v), length);
}

var unitNormal = function (pv0, p1) {           // Unit normal to vector pv0, or line segment from p0 to p1
    if (p1 != null) pv0 = vecFrom (pv0, p1);
    var normalVec = [ -pv0[1], pv0[0] ];
    return vecUnit (normalVec);
};


// Hull Generators

var lineFn = d3.line()
    .curve (d3.curveCatmullRomClosed)
    .x (function(d) { return d.p[0]; })
    .y (function(d) { return d.p[1]; });


export function smoothHull(polyPoints, hullPadding) {
    // Returns the SVG path data string representing the polygon, expanded and smoothed.

    var pointCount = polyPoints.length;

    // Handle special cases
    if (!polyPoints || pointCount < 1) return "";
    if (pointCount === 1) return smoothHull1 (polyPoints, hullPadding);
    if (pointCount === 2) return smoothHull2 (polyPoints, hullPadding);

    var hullPoints = polyPoints.map (function (point, index) {
        var pNext = polyPoints[(index + 1) % pointCount];
        return {
            p: point,
            v: vecUnit (vecFrom (point, pNext))
        };
    });

    // Compute the expanded hull points, and the nearest prior control point for each.
    for (var i = 0;  i < hullPoints.length;  ++i) {
        var priorIndex = (i > 0) ? (i-1) : (pointCount - 1);
        var extensionVec = vecUnit (vecSum (hullPoints[priorIndex].v, vecScale (hullPoints[i].v, -1)));
        hullPoints[i].p = vecSum (hullPoints[i].p, vecScale (extensionVec, hullPadding));
    }

    return lineFn (hullPoints);
}


var smoothHull1 = function (polyPoints, hullPadding) {
    // Returns the path for a circular hull around a single point.

    var p1 = [polyPoints[0][0], polyPoints[0][1] - hullPadding];
    var p2 = [polyPoints[0][0], polyPoints[0][1] + hullPadding];

    return 'M ' + p1
        + ' A ' + [hullPadding, hullPadding, '0,0,0', p2].join(',')
        + ' A ' + [hullPadding, hullPadding, '0,0,0', p1].join(',');
};


var smoothHull2 = function (polyPoints, hullPadding) {
    // Returns the path for a rounded hull around two points.

    var v = vecFrom (polyPoints[0], polyPoints[1]);
    var extensionVec = vecScaleTo(v, hullPadding);

    var extension0 = vecSum (polyPoints[0], vecScale(extensionVec, -1));
    var extension1 = vecSum (polyPoints[1], extensionVec);

    var tangentHalfLength = 1.2 * hullPadding;
    var controlDelta    = vecScaleTo (unitNormal(v), tangentHalfLength);
    var invControlDelta = vecScale (controlDelta, -1);

    var control0 = vecSum (extension0, invControlDelta);
    var control1 = vecSum (extension1, invControlDelta);
    var control3 = vecSum (extension0, controlDelta);

    return 'M ' + extension0
        + ' C ' + [control0, control1, extension1].join(',')
        + ' S ' + [          control3, extension0].join(',')
        + ' Z';
};
