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
    Point = H.Point,
    SvgRenderer = H.SVGRenderer,
    defaultOptions = H.defaultOptions,
    addEvent = H.addEvent,
    merge = H.merge,
    extend = H.extend,
    baseGeneratePoints = Series.prototype.generatePoints,
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
     * @default   false
     * @since
     * @apioption cluster.enabled
     */
    enabled: false,
    allowOverlap: true,
    minimumClusterSize: 2,
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
        gridSize: 50
    },
    style: {
        // fillColor: 'green',
        symbol: 'cluster',
        radius: 12
    },
    dataLabels: {
        enabled: true,
        format: '{point.clusteredDataLen}',
        verticalAlign: 'middle',
        align: 'center'
    }
    // zones: [{
    //     from: 1,
    //     to: 10,
    //     style: {
    //         symbol: 'cluster',
    //         fillColor: 'green',
    //         // lineColor: 'rgba(0, 0, 0, 0.3)',
    //         radius: 10
    //     }
    // }, {
    //     from: 11,
    //     to: 20,
    //     style: {
    //         symbol: 'cluster',
    //         fillColor: 'yellow',
    //         // lineColor: 'rgba(0, 0, 0, 0.3)',
    //         radius: 15
    //     }
    // }]
};

H.defaultOptions.plotOptions = extend({
    series: {
        marker: {
            cluster: clusterDefaultOptions
        },
        tooltip: {
            clusterFormat: '<span>Clustered points: ' +
                '{point.clusteredDataLen}</span><br/>'
        }
    }
}, H.defaultOptions.plotOptions);

// Cluster symbol
SvgRenderer.prototype.symbols.cluster = function (x, y, width, height) {
    var w = width / 2,
        h = height / 2;

    var outerWidth = 1,
        space = 1,
        inner, outer1, outer2;

    inner = this.arc(x + w, y + h, w - space, h - space, {
        start: Math.PI * 0.5,
        end: Math.PI * 2.5,
        open: false
    });

    outer1 = this.arc(x + w, y + h, w, h, {
        start: Math.PI * 0.5,
        end: Math.PI * 2.5,
        innerR: w + outerWidth,
        open: false
    });

    outer2 = this.arc(x + w, y + h, w + space * 2, h + space * 2, {
        start: Math.PI * 0.5,
        end: Math.PI * 2.5,
        innerR: w + outerWidth * 2.5,
        open: false
    });

    return outer2.concat(outer1, inner);
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
                fill: 'rgba(0, 255, 0, 0.1)',
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
            xAxis = series.xAxis,
            yAxis = series.yAxis,
            xAxisLen = series.xAxis.len,
            yAxisLen = series.yAxis.len,
            i, j, elem, text,
            scaleX = xAxis.dataMin < xAxis.min ?
                (xAxis.max - xAxis.min) / (xAxis.dataMax - xAxis.dataMin) : 1,
            scaleY = yAxis.dataMin < yAxis.min ?
                (yAxis.max - yAxis.min) / (yAxis.dataMax - yAxis.dataMin) : 1,
            mapXSize = xAxisLen / scaleX,
            mapYSize = yAxisLen / scaleY,
            gridX = Math.ceil(mapXSize / size),
            gridY = Math.ceil(mapYSize / size),
            offsetX = xAxis.dataMin < xAxis.min ?
                Math.abs(
                    xAxis.toPixels(xAxis.min) - xAxis.toPixels(xAxis.dataMin)
                ) : 0,
            offsetY = yAxis.dataMin < yAxis.min ?
                Math.abs(
                    yAxis.toPixels(yAxis.min) - yAxis.toPixels(yAxis.dataMin)
                ) : 0,
            currentX = 0,
            currentY = 0;

        if (chart.debugGridLines && chart.debugGridLines.length) {
            chart.debugGridLines.forEach(function (gridItem) {
                if (gridItem && gridItem.destroy) {
                    gridItem.destroy();
                }
            });
        }

        chart.debugGridLines = [];

        for (i = 0; i < gridX; i++) {
            currentX = i * size;

            if (
                currentX >= (offsetX - size) &&
                currentX <= xAxisLen + offsetX
            ) {
                for (j = 0; j < gridY; j++) {
                    currentY = j * size;

                    if (
                        currentY >= (offsetY - size) &&
                        currentY <= yAxisLen + offsetY
                    ) {
                        elem = chart.renderer
                            .rect(
                                chart.plotLeft + i * size - offsetX,
                                chart.plotTop + j * size - offsetY,
                                size,
                                size
                            )
                            .attr({
                                stroke: '#000',
                                'stroke-width': '1px'
                            })
                            .add()
                            .toFront();

                        text = chart.renderer
                            .text(
                                j + '-' + i,
                                chart.plotLeft + i * size - offsetX + 5,
                                chart.plotTop + j * size - offsetY + 15
                            )
                            .css({
                                fill: 'rgba(0, 0, 0, 0.7)',
                                fontSize: '11px'
                            })
                            .add()
                            .toFront();

                        chart.debugGridLines.push(elem);
                        chart.debugGridLines.push(text);
                    }
                }
            }
        }
    }
};


Series.prototype.clusterAlgorithms = {
    grid: function (processedXData, processedYData, options) {
        var series = this,
            chart = series.chart,
            xAxis = series.xAxis,
            yAxis = series.yAxis,
            gridSize = options.gridSize,
            grid = {},
            offsetX = xAxis.dataMin < xAxis.min ?
                Math.abs(
                    xAxis.toPixels(xAxis.min) - xAxis.toPixels(xAxis.dataMin)
                ) : 0,
            offsetY = yAxis.dataMin < yAxis.min ?
                Math.abs(
                    yAxis.toPixels(yAxis.min) - yAxis.toPixels(yAxis.dataMin)
                ) : 0,
            x, y, gridX, gridY, key, i;

        // ---- Debug: needed to draw grid lines ---- //
        if (options.debugDrawGridLines) {
            debug.drawGridLines(options.gridSize, series);
        }

        for (i = 0; i < processedXData.length; i++) {
            x = xAxis.toPixels(processedXData[i]) + offsetX - chart.plotLeft;
            y = yAxis.toPixels(processedYData[i]) + offsetY - chart.plotTop;
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

        return grid;
    }
};

var preventClusterColisions = {
    grid: function (props) {
        var series = this,
            chart = series.chart,
            xAxis = series.xAxis,
            yAxis = series.yAxis,
            gridX = +props.key.split('-')[1],
            gridY = +props.key.split('-')[0],
            gridSize = props.gridSize,
            splittedData = props.splittedData,
            radius = props.radius,
            offsetX = xAxis.dataMin < xAxis.min ?
                Math.abs(
                    xAxis.toPixels(xAxis.min) - xAxis.toPixels(xAxis.dataMin)
                ) : 0,
            offsetY = yAxis.dataMin < yAxis.min ?
                Math.abs(
                    yAxis.toPixels(yAxis.min) - yAxis.toPixels(yAxis.dataMin)
                ) : 0,
            gridXPx = gridX * gridSize,
            gridYPx = gridY * gridSize,
            xPixel = xAxis.toPixels(props.x) - chart.plotLeft,
            yPixel = yAxis.toPixels(props.y) - chart.plotTop,
            gridsToCheckCollision = [],
            signX,
            signY,
            cornerGridX,
            cornerGridY,
            i,
            itemX,
            itemY;

        if (
            xPixel >= 0 &&
            xPixel <= xAxis.len &&
            yPixel >= 0 &&
            yPixel <= yAxis.len
        ) {
            xPixel += offsetX;
            yPixel += offsetY;

            for (i = 1; i < 5; i++) {
                signX = i % 2 === 1 ? -1 : 1;
                signY = i < 3 ? -1 : 1;

                cornerGridX = Math.floor(
                    (xPixel + signX * radius) / gridSize
                );
                cornerGridY = Math.floor(
                    (yPixel + signY * radius) / gridSize
                );

                if (cornerGridX !== gridX || cornerGridY !== gridY) {
                    gridsToCheckCollision.push(cornerGridY + '-' + cornerGridX);
                }
            }

            gridsToCheckCollision.forEach(function (item) {
                if (splittedData[item]) {
                    itemX = +item.split('-')[1];
                    itemY = +item.split('-')[0];

                    if (itemX !== gridX) {
                        xPixel = itemX - gridX < 0 ?
                            gridXPx + radius : gridXPx + gridSize - radius;
                    }

                    if (itemY !== gridY) {
                        yPixel = itemY - gridY < 0 ?
                            gridYPx + radius : gridYPx + gridSize - radius;
                    }
                }
            });

            return {
                x: xAxis.toValue(xPixel + chart.plotLeft - offsetX),
                y: yAxis.toValue(yPixel + chart.plotTop - offsetY)
            };
        }

        return {
            x: props.x,
            y: props.y
        };
    }
};

Series.prototype.getClusteredData = function (splittedData, options) {
    var series = this,
        minimumClusterSize = options.minimumClusterSize > 2 ?
            options.minimumClusterSize : 2,
        groupedXData = [],
        groupedYData = [],
        clusters = [], // Container for clusters.
        noise = [], // Container for points not belonging to any cluster.
        groupMap = [],
        index = 0,
        point,
        pointOptions,
        points,
        pointsLen,
        clusterPos,
        sumX,
        sumY,
        zoneOptions,
        i,
        k,
        opt;

    // ---- Debug: needed to destory marker clusters ---- //
    debug.destroyClusters(series);

    for (k in splittedData) {
        if (splittedData[k].length >= minimumClusterSize) {

            points = splittedData[k];
            pointsLen = points.length;
            sumX = 0;
            sumY = 0;

            for (i = 0; i < pointsLen; i++) {
                sumX += points[i].x;
                sumY += points[i].y;

                // Save cluster data points options.
                points[i].options = series.options.data[points[i].index];
            }

            // Get zone options for cluster.
            if (options.zones) {
                for (i = 0; i < options.zones.length; i++) {
                    if (
                        pointsLen >= options.zones[i].from &&
                        pointsLen <= options.zones[i].to
                    ) {
                        zoneOptions = options.zones[i].style;
                    }
                }
            }

            // ---- Debug: needed to draw a marker cluster ---- //
            if (options.layoutAlgorithm.debugDrawClusters) {
                var xAxis = series.xAxis,
                    yAxis = series.yAxis,
                    debugPosX = xAxis.toPixels(sumX / pointsLen),
                    debugPosY = yAxis.toPixels(sumY / pointsLen);

                debug.drawCluster(debugPosX, debugPosY, pointsLen, series);
            }
            // ---- Debug: needed to draw a marker cluster ---- //

            if (
                options.layoutAlgorithm.type === 'grid' &&
                !options.allowOverlap
            ) {
                clusterPos = preventClusterColisions.grid.call(
                    this,
                    {
                        x: sumX / pointsLen,
                        y: sumY / pointsLen,
                        key: k,
                        splittedData: splittedData,
                        gridSize: options.layoutAlgorithm.gridSize,
                        radius: (zoneOptions && zoneOptions.radius) ?
                            zoneOptions.radius : options.style.radius
                    }
                );
            } else {
                clusterPos = {
                    x: sumX / pointsLen,
                    y: sumY / pointsLen
                };
            }

            clusters.push({
                x: clusterPos.x,
                y: clusterPos.y,
                id: k,
                index: index,
                data: points
            });

            groupedXData.push(clusterPos.x);
            groupedYData.push(clusterPos.y);

            groupMap.push({
                options: {
                    formatPrefix: 'cluster',
                    dataLabels: options.dataLabels,
                    marker: merge({
                        symbol: options.style.symbol || 'cluster',
                        fillColor: options.style.fillColor,
                        lineColor: options.style.lineColor,
                        lineWidth: options.style.lineWidth,
                        radius: options.style.radius
                    }, zoneOptions || {}),
                    key: pointsLen
                }
            });

            index++;
            zoneOptions = null;
        } else {
            for (i = 0; i < splittedData[k].length; i++) {
                // Points not belonging to any cluster.
                point = splittedData[k][i];
                pointOptions = {};
                groupedXData.push(point.x);
                groupedYData.push(point.y);

                noise.push({
                    x: point.x,
                    y: point.y,
                    id: k,
                    index: index,
                    data: splittedData[k]
                });

                // Save point options.
                for (opt in series.options.data[point.index]) {
                    pointOptions[opt] = series.options.data[point.index][opt];
                }

                groupMap.push({
                    options: pointOptions
                });

                index++;
            }
        }
    }

    // To DO - make another function to prevent clasters collision

    return {
        clusters: clusters,
        noise: noise,
        groupedXData: groupedXData,
        groupedYData: groupedYData,
        groupMap: groupMap
    };
};


// // Destroy clustered data points
Series.prototype.destroyClusteredData = function () {
    var clusteredData = this.clusteredData;

    // clear previous groups
    (clusteredData || []).forEach(function (point, i) {
        if (point) {
            clusteredData[i] = point.destroy ? point.destroy() : null;
        }
    });
    this.clusteredData = null;
};

// Override the generatePoints method by adding a reference to grouped data
Series.prototype.generatePoints = function () {
    var series = this,
        marker = series.options.marker,
        algorithm,
        clusteredData,
        splittedData,
        point;

    if (marker && marker.cluster && marker.cluster.enabled) {
        algorithm = marker.cluster.layoutAlgorithm.type;

        if (series.clusterAlgorithms[algorithm]) {

            splittedData = series.clusterAlgorithms[algorithm].call(
                this,
                series.processedXData,
                series.processedYData,
                marker.cluster.layoutAlgorithm
            );

            clusteredData = series.getClusteredData.call(
                this, splittedData, marker.cluster
            );

            if (!marker.cluster.layoutAlgorithm.debugDrawPoints) {
                series.processedXData = clusteredData.groupedXData;
                series.processedYData = clusteredData.groupedYData;

                series.hasGroupedData = true;
                series.clusters = clusteredData;
                series.groupMap = clusteredData.groupMap;
            }
        }

        baseGeneratePoints.apply(this);

        if (!marker.cluster.layoutAlgorithm.debugDrawPoints) {
            // Mark cluster points. Safe point reference in the cluster object.
            series.clusters.clusters.forEach(function (cluster) {
                point = series.points[cluster.index];

                point.isCluster = true;
                point.clusteredData = cluster.data;
                point.clusteredDataLen = cluster.data.length;
                cluster.point = point;
            });

            // Safe point reference in the noise object.
            series.clusters.noise.forEach(function (noise) {
                noise.point = series.points[noise.index];
            });
        }

        // Record grouped data in order to let it be destroyed the next time
        // processData runs
        this.destroyClusteredData();
        this.clusteredData = this.hasGroupedData ? this.points : null;
    } else {
        baseGeneratePoints.apply(this);
    }
};

// Override point prototype to throw a warning when trying to update
// clustered points.
addEvent(Point, 'update', function () {
    if (this.dataGroup) {
        // Update cluster error
        // H.error(50, false, this.series.chart);
        return false;
    }
});

// Destroy grouped data on series destroy
addEvent(Series, 'destroy', Series.prototype.destroyClusteredData);

// Add class for clusters.
addEvent(Series, 'afterRender', function () {
    var series = this;

    if (series.clusters && series.clusters.clusters) {
        series.clusters.clusters.forEach(function (cluster) {
            cluster.point.graphic.addClass('highcharts-cluster-point');
        });
    }
});
