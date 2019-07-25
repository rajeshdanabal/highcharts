/* *
 *
 *  Marker clusters module.
 *
 *  (c) 2010-2019 Highsoft AS
 *
 *  Author: Wojciech Chmiel, Sebastian Wedzel
 *
 *  License: www.highcharts.com/license
 *
 * */

'use strict';

import H from './../parts/Globals.js';
import './../parts/Series.js';
import './../parts/Axis.js';
import './../parts/SvgRenderer.js';

var Series = H.Series,
    seriesProto = Series.prototype,
    Point = H.Point,
    SvgRenderer = H.SVGRenderer,
    defaultOptions = H.defaultOptions,
    addEvent = H.addEvent,
    setOptions = H.setOptions,
    baseGeneratePoints = seriesProto.generatePoints,
    clusterDefaultOptions;


// Add the cluster related options

/**
 * some comments here
 */
clusterDefaultOptions = {
    /**
     * Whether to enable the marker-clusters module.
     *
     * @sample
     *
     * @type      {boolean}
     * @default   true
     * @since
     * @apioption cluster.enabled
     */
    enabled: true,

    layoutAlgorithm: {
        /**
         * Type of the algorithm used when positioning nodes.
         *
         * @type {string}
         */
        type: 'grid',

        /**
         * When `type` is set to 'grid',
         * `gridSize` is a size of a grid item element.
         *
         * @type    {number}
         * @default 50
         * @since
         */
        gridSize: 50,
        minimumClusterSize: 2
    },
    style: {
        color: 'green',
        symbol: 'cluster'
    },
    fillColors: [{
        from: 0,
        to: 10,
        color: 'green'
    }, {
        from: 10,
        to: 20,
        color: 'red'
    }]
};

setOptions({
    plotOptions: {
        series: {
            marker: {
                cluster: clusterDefaultOptions
            }
        }
    }
});

// Cluster symbol
SvgRenderer.prototype.symbols.cluster = function (x, y, w, h) {
    var outerWidth = 1,
        space = 1.5,
        outer = this.arc(x + w / 2, y + h / 2, w, h, {
            start: Math.PI * 0.5,
            end: Math.PI * 2.5,
            innerR: w + outerWidth,
            open: false
        }),
        inner = this.arc(x + w / 2, y + h / 2, w - space, h - space, {
            start: Math.PI * 0.5,
            end: Math.PI * 2.5,
            open: false
        });

    return [...outer, ...inner];
};

defaultOptions.symbols.push('cluster');

var debug = {
    destroyClusters: function (series) {
        var chart = series.chart,
            clusterId = 'debug-clusters-' + series.name;

        if (chart[clusterId] && chart[clusterId].length) {
            chart[clusterId].forEach(function (clusterItem) {
                if (clusterItem && clusterItem.destroy) {
                    clusterItem.destroy();
                }
            });
        }

        chart[clusterId] = [];
    },
    drawCluster: function (x, y, text, series) {
        var chart = series.chart,
            textElem, elem,
            clusterId = 'debug-clusters-' + series.name;

        elem = chart.renderer
            .circle(x, y, 15)
            .attr({
                fill: series.color,
                'stroke-width': '1px',
                stroke: '#000'
            })
            .add()
            .toFront();

        textElem = chart.renderer
            .text(text, x - 5, y + 5)
            .css({
                fill: '#000',
                fontSize: '12px'
            })
            .add()
            .toFront();

        chart[clusterId].push(elem);
        chart[clusterId].push(textElem);
    },
    drawGridLines: function (size, series) {
        var chart = series.chart,
            xAxisLen = series.xAxis.len,
            yAxisLen = series.yAxis.len,
            gridX = Math.ceil(xAxisLen / size),
            gridY = Math.ceil(yAxisLen / size),
            i, j, elem;

        if (chart.debugGridLines && chart.debugGridLines.length) {
            chart.debugGridLines.forEach(function (gridItem) {
                if (gridItem && gridItem.destroy) {
                    gridItem.destroy();
                }
            });
        }

        chart.debugGridLines = [];

        for (i = 0; i < gridX; i++) {
            for (j = 0; j < gridY; j++) {
                elem = chart.renderer
                    .rect(
                        chart.plotLeft + i * size,
                        chart.plotTop + j * size,
                        size,
                        size
                    )
                    .attr({
                        stroke: '#000',
                        'stroke-width': '1px'
                    })
                    .add()
                    .toFront();

                chart.debugGridLines.push(elem);
            }
        }
    }
};


var clusterAlgorithms = {
    grid: function (processedXData, processedYData, options) {
        var series = this,
            chart = series.chart,
            xAxis = series.xAxis,
            yAxis = series.yAxis,
            minimumClusterSize = options.minimumClusterSize > 2 ?
                options.minimumClusterSize : 2,
            gridSize = options.gridSize,
            groupedXData = [],
            groupedYData = [],
            clusters = [], // Container for clusters.
            noise = [], // Container for points not belonging to any cluster.
            grid = {},
            groupMap = [],
            x, y, gridX, gridY, key, i, points,
            pointsLen, posX, posY, sumX, sumY, index;

        // ---- Debug: needed to destory marker clusters ---- //
        debug.destroyClusters(series);

        // ---- Debug: needed to draw grid lines ---- //
        debug.drawGridLines(gridSize, series);

        for (i = 0; i < processedXData.length; i++) {
            x = xAxis.toPixels(processedXData[i]) - chart.plotLeft;
            y = yAxis.toPixels(processedYData[i]) - chart.plotTop;
            gridX = Math.floor(x / gridSize);
            gridY = Math.floor(y / gridSize);
            key = gridY + '-' + gridX;

            if (!grid[key]) {
                grid[key] = [];
            }

            grid[key].push({
                index: i,
                x: processedXData[i],
                y: processedYData[i]
            });
        }

        index = 0;

        for (var k in grid) {
            if (grid[k].length >= minimumClusterSize) {

                points = grid[k];
                pointsLen = points.length;
                sumX = 0;
                sumY = 0;

                for (i = 0; i < pointsLen; i++) {
                    sumX += points[i].x;
                    sumY += points[i].y;
                }

                // ---- Debug: needed to draw a marker cluster ---- //
                posX = xAxis.toPixels(sumX / pointsLen);
                posY = yAxis.toPixels(sumY / pointsLen);
                debug.drawCluster(posX, posY, pointsLen, series);
                // ---- Debug: needed to draw a marker cluster ---- //

                clusters.push({
                    x: sumX / pointsLen,
                    y: sumY / pointsLen,
                    id: k,
                    index: index,
                    points: points
                });

                groupedXData.push(sumX / pointsLen);
                groupedYData.push(sumY / pointsLen);

                groupMap.push({
                    options: {
                        marker: {
                            symbol: 'cluster'
                        }
                    }
                });

            } else {
                for (i = 0; i < grid[k].length; i++) {
                    // Points not belonging to any cluster.
                    groupedXData.push(grid[k][i].x);
                    groupedYData.push(grid[k][i].y);

                    noise.push({
                        x: grid[k][i].x,
                        y: grid[k][i].y,
                        id: k,
                        index: index,
                        points: grid[k]
                    });

                    groupMap.push({
                        options: {}
                    });
                }
            }

            index++;
        }

        return {
            clusters: clusters,
            noise: noise,
            groupedXData: groupedXData,
            groupedYData: groupedYData,
            groupMap: groupMap
        };
    }
};


// Destroy the clustered data points
seriesProto.destroyClusteredData = function () {
    var groupedData = this.groupedData;

    // clear previous groups
    (groupedData || []).forEach(function (point, i) {
        if (point) {
            groupedData[i] = point.destroy ? point.destroy() : null;
        }
    });
    this.groupedData = null;
};

// Override the generatePoints method by adding a reference to grouped data
seriesProto.generatePoints = function () {
    var series = this,
        marker = series.options.marker,
        algorithm,
        clusteredData;

    if (marker && marker.cluster && marker.cluster.enabled) {
        algorithm = marker.cluster.layoutAlgorithm.type;

        clusteredData = clusterAlgorithms[algorithm].call(
            this,
            series.processedXData,
            series.processedYData,
            marker.cluster.layoutAlgorithm
        );

        series.processedXData = clusteredData.groupedXData;
        series.processedYData = clusteredData.groupedYData;

        series.hasGroupedData = true;
        series.clusters = clusteredData;
        series.groupMap = clusteredData.groupMap;

        baseGeneratePoints.apply(this);

        // Record grouped data in order to let it be destroyed the next time
        // processData runs
        this.destroyClusteredData();
        this.groupedData = this.hasGroupedData ? this.points : null;
    } else {
        baseGeneratePoints.apply(this);
    }
};

// Override point prototype to throw a warning when trying to update
// clustered points.
addEvent(Point, 'update', function () {
    if (this.dataGroup) {
        // Update cluster error
        // H.error(24, false, this.series.chart);
        return false;
    }
});

// Destroy grouped data on series destroy
addEvent(Series, 'destroy', seriesProto.destroyClusteredData);
