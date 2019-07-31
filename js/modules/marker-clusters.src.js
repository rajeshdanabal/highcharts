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
    Tooltip = H.Tooltip,
    format = H.format,
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
        type: 'gridOnMap',

        /**
         * When `type` is set to 'gridOnView',
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
        // color: 'green',
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
            },
            tooltip: {
                headerClusterFormat: '',
                footerClusterFormat: '',
                pointClusterFormat: '<span>Clustered points: ' +
                    '{point.clusteredDataLen}</span><br/>'
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
    drawGridLinesPerView: function (size, series) {
        var chart = series.chart,
            xAxisLen = series.xAxis.len,
            yAxisLen = series.yAxis.len,
            gridX = Math.ceil(xAxisLen / size),
            gridY = Math.ceil(yAxisLen / size),
            i, j, elem, text;

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

                text = chart.renderer
                    .text(
                        j + '-' + i,
                        chart.plotLeft + i * size + 5,
                        chart.plotTop + j * size + 15
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
    },
    drawGridLinesPerMap: function (size, series) {
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


var clusterAlgorithms = {
    gridOnView: function (processedXData, processedYData, options) {
        var series = this,
            chart = series.chart,
            xAxis = series.xAxis,
            yAxis = series.yAxis,
            gridSize = options.gridSize,
            grid = {},
            x, y, gridX, gridY, key, i;

        // ---- Debug: needed to draw grid lines ---- //
        debug.drawGridLinesPerView(gridSize, series);

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

        return grid;
    },
    gridOnMap: function (processedXData, processedYData, options) {
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
        // debug.drawGridLinesPerMap(options.gridSize, series);

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

function getClusteredData(splittedData, options) {
    var series = this,
        minimumClusterSize = options.minimumClusterSize > 2 ?
            options.minimumClusterSize : 2,
        groupedXData = [],
        groupedYData = [],
        clusters = [], // Container for clusters.
        noise = [], // Container for points not belonging to any cluster.
        groupMap = [],
        index = 0,
        points,
        pointsLen,
        sumX,
        sumY,
        i;

    // ---- Debug: needed to destory marker clusters ---- //
    debug.destroyClusters(series);

    for (var k in splittedData) {
        if (splittedData[k].length >= minimumClusterSize) {

            points = splittedData[k];
            pointsLen = points.length;
            sumX = 0;
            sumY = 0;

            for (i = 0; i < pointsLen; i++) {
                sumX += points[i].x;
                sumY += points[i].y;
            }

            // ---- Debug: needed to draw a marker cluster ---- //
            // var xAxis = series.xAxis,
            //     yAxis = series.yAxis,
            //     debugPosX = xAxis.toPixels(sumX / pointsLen),
            //     debugPosY = yAxis.toPixels(sumY / pointsLen);

            // debug.drawCluster(debugPosX, debugPosY, pointsLen, series);
            // ---- Debug: needed to draw a marker cluster ---- //

            clusters.push({
                x: sumX / pointsLen,
                y: sumY / pointsLen,
                id: k,
                index: index,
                data: points
            });

            groupedXData.push(sumX / pointsLen);
            groupedYData.push(sumY / pointsLen);

            groupMap.push({
                options: {
                    marker: {
                        symbol: options.style.symbol || 'cluster',
                        fillColor: options.style.color,
                        lineColor: options.style.color
                    },
                    key: splittedData[k].length
                }
            });
        } else {
            for (i = 0; i < splittedData[k].length; i++) {
                // Points not belonging to any cluster.
                groupedXData.push(splittedData[k][i].x);
                groupedYData.push(splittedData[k][i].y);

                noise.push({
                    x: splittedData[k][i].x,
                    y: splittedData[k][i].y,
                    id: k,
                    index: index,
                    data: splittedData[k]
                });

                groupMap.push({
                    options: {
                        name: series.options.data[index].name
                    }
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


// Destroy clustered data points
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
        clusteredData,
        splittedData,
        point;

    if (marker && marker.cluster && marker.cluster.enabled) {
        algorithm = marker.cluster.layoutAlgorithm.type;

        if (clusterAlgorithms[algorithm]) {

            splittedData = clusterAlgorithms[algorithm].call(
                this,
                series.processedXData,
                series.processedYData,
                marker.cluster.layoutAlgorithm
            );

            clusteredData = getClusteredData.call(
                this, splittedData, marker.cluster
            );

            series.processedXData = clusteredData.groupedXData;
            series.processedYData = clusteredData.groupedYData;

            series.hasGroupedData = true;
            series.clusters = clusteredData;
            series.groupMap = clusteredData.groupMap;
        }

        baseGeneratePoints.apply(this);

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

// Extend the original method, add pointClusterFormat.
Tooltip.prototype.bodyFormatter = function (items) {
    return items.map(function (item) {
        var tooltipOptions = item.series.tooltipOptions,
            format;

        if (item.point.isCluster) {
            format = tooltipOptions.pointClusterFormat || '';
        } else {
            format = tooltipOptions[
                (item.point.formatPrefix || 'point') + 'Format'
            ] || '';
        }

        return (
            tooltipOptions[
                (item.point.formatPrefix || 'point') + 'Formatter'
            ] ||
            item.point.tooltipFormatter
        ).call(
            item.point,
            format
        );
    });
};

// Extend the original method, add headerClusterFormat and footerClusterFormat.
addEvent(Tooltip, 'headerFormatter', function (e) {
    var tooltip = this,
        time = tooltip.chart.time,
        labelConfig = e.labelConfig,
        series = labelConfig.series,
        point = labelConfig.point,
        tooltipOptions = series.tooltipOptions,
        partFormat = point.isCluster ? 'ClusterFormat' : 'Format',
        formatString =
            tooltipOptions[(e.isFooter ? 'footer' : 'header') + partFormat];

    // Replace default header style with class name
    if (series.chart.styledMode) {
        formatString = this.styledModeFormat(formatString);
    }
    // return the replaced format
    e.text = format(formatString, {
        point: labelConfig.point,
        series: series
    }, time);
    e.preventDefault();
});
