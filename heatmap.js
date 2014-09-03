;(function() {
    'use strict';

    // Default settings
    var defaults = {
	// Selector string of heatmap container
	selector: '#heatmap',

	// Size of each cell, in pixels
	cellSize: 20,

	// Padding between each cell, in pixels
	cellPadding: 2,

	// Border radius of each cell, in pixels
	cellRadius: 2,

	rowLabels: [],

	columnLabels: [],

	displayLegend: true,

	// Width of each legend element, in pixels
	legendEleWidth: 40,

	// Height of each legend element, in pixels
	legendEleHeight: 10,

	// Whether to determine thresholds for legend colors automatically based on data
	legendAutoThreshold: false,

	// Thresholds for legendColors if legendAutoThreshold is false
	legendThresholds: [0, 2, 4, 6, 8],

	//legendColors: ['#eee', '#d6e685', '#8cc665', '#44a340', '#1e6823'],
	legendColors: ["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"],

	// Url to fetch JSON data from
	data: '',

	// Whether to focus on cell when clicked
	focusOnClick: false,

	// Callback when clicking on a cell
	onClick: null,

	// Whether to display tooltips when hovering over cells
	tooltip: false,

	// Text to display in tooltip if tooltip is true
	tooltipText: function(d) {
	    return 'Value: ' + d.value;
	}
    };

    function Heatmap(settings) {
	settings = settings || {};
	this.settings = merge(defaults, settings); // TODO: don't override defaults object

	// Compute dimensions
	this.margin = { top: 30, right: 0, bottom: 30, left: 40 };
	this.cellSize = this.settings.cellSize + this.settings.cellPadding;
	this.dim = {
	    'width': this.margin.left + this.margin.right +
		this.cellSize * this.settings.colLabels.length,
	    'height': this.margin.top + this.margin.bottom +
		this.cellSize * this.settings.rowLabels.length +
		(this.settings.displayLegend ? this.settings.legendEleHeight + this.margin.bottom : 0)
	};

	// Load data and initialize chart with data
	d3.json(this.settings.data, function(err, data) {
	    if (err) {
		throw err;
	    }

	    this.data = data.map(function(d) {
		return {
		    row: +d.row,
		    col: +d.col,
		    value: +d.value
		}
	    });

	    this.init();
	}.bind(this));
    }

    Heatmap.prototype = {
	init: function() {
	    if (this.settings.legendAutoThreshold) {
		this.colorScale = d3.scale.quantile()
		    .domain([0, this.settings.legendColors.length - 1,
			     d3.max(this.data, function(d) { return d.value; })])
		    .range(this.settings.legendColors);
	    } else {
		this.colorScale = function(val) {
		    for (var i = 0; i < this.settings.legendThresholds.length; i++) {
			if (val <= this.settings.legendThresholds[i]) {
			    return this.settings.legendColors[i];
			}
		    }
		}
	    }

	    this.svg = d3.select(this.settings.selector).append('svg')
		.attr('width', this.dim.width)
		.attr('height', this.dim.height + this.margin.top) // add additional margin for transform
		.append('g')
		.attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

	    if (this.settings.tooltip) {
		this.tooltip = d3.tip()
		.attr('class', 'd3-tip')
		.offset([-10, 0])
		.html(function(d) { // TODO: clean user input
		    return this.settings.tooltipText.call(this, d);
		}.bind(this));

		this.svg.call(this.tooltip);
	    }

	    this.drawHeatmap();

	    if (this.settings.displayLegend) {
		this.drawLegend();
	    }
	},

	drawHeatmap: function() {
	    var rowLabels = this.svg.selectAll('.rowLabel')
		.data(this.settings.rowLabels)
		.enter().append('text')
		.text(function(rl) { return rl; })
		.attr('x', 0)
		.attr('y', function(rl, i) { return i * this.cellSize; }.bind(this))
		.style('text-anchor', 'end')
		.attr('transform', 'translate(-6,' + this.settings.cellSize / 1.5 + ')')
		.attr('class', 'rowLabel mono axis');

	    var colLabels = this.svg.selectAll('.colLabel')
		.data(this.settings.colLabels)
		.enter().append('text')
		.text(function(cl) { return cl; })
		.attr('x', function(cl, i) { return i * this.cellSize; }.bind(this))
		.attr('y', 0)
		.style('text-anchor', 'middle')
		.attr('transform', 'translate(' + this.settings.cellSize / 2 + ', -6)')
		.attr('class', 'colLabel mono axis');

	    var heatmapChart = this.svg.selectAll('.cell')
		.data(this.data)
		.enter().append('rect')
		.attr('x', function(d) { return (d.col - 1) * this.cellSize; }.bind(this))
		.attr('y', function(d) { return (d.row - 1) * this.cellSize; }.bind(this))
		.attr('rx', this.settings.cellRadius)
		.attr('ry', this.settings.cellRadius)
		.attr('class', 'cell')
		.attr('width', this.settings.cellSize)
		.attr('height', this.settings.cellSize)
		.style('fill', this.settings.legendColors[0])//;
		.on('click', function(cell) {
		    if (this.settings.focusOnClick) {
			heatmapChart.each(function(otherCell) {
			    var otherCellDiv = d3.select(this);
			    if (otherCell !== cell) {
				otherCellDiv.attr('class', 'cell focusout');
			    } else {
				otherCellDiv.attr('class', 'cell focus');
			    }
			});
		    }

		    this.settings.onClick.call(this, cell);
		}.bind(this))
		.on('mouseover', function(cell) {
		    if (this.settings.tooltip) {
			this.tooltip.show(cell);
		    }
		}.bind(this))
		.on('mouseout', function(cell) {
		    if (this.settings.tooltip) {
			this.tooltip.hide(cell);
		    }
		}.bind(this));

	    // Fill cells
	    heatmapChart.transition().duration(1000)
		.style('fill', function(d) { return this.colorScale(d.value) }.bind(this));
	},

	drawLegend: function() {
	    var legend = this.svg.selectAll('.legend')
		.data([0].concat(this.settings.legendAutoThreshold
				 ? this.colorScale.quantiles()
				 : this.settings.legendThresholds), function(d) { return d; })
		.enter().append('g')
		.attr('class', 'legend');

	    legend.append('rect')
		.attr('x', function(l, i) { return this.settings.legendEleWidth * i; }.bind(this))
		.attr('y', this.dim.height - this.settings.legendEleHeight - this.margin.bottom)
		.attr('width', this.settings.legendEleWidth)
		.attr('height', this.settings.legendEleHeight)
		.style('fill', function(l, i) { return this.settings.legendColors[i]; }.bind(this));

	    legend.append('text')
		.attr('class', 'mono')
		.text(function(l) { return Math.round(l); })
		.attr('x', function(l, i) { return this.settings.legendEleWidth * i; }.bind(this))
		.attr('y', this.dim.height + this.settings.legendEleHeight - this.margin.bottom);
	}
    };

    /*
     * Recursively merge properties of two objects
     * http://stackoverflow.com/a/383245
     */
    function merge(obj1, obj2) {
	for (var p in obj2) {
	    try {
		// Property in destination object set; update its value.
		if (obj2[p].constructor == Object) {
		    obj1[p] = merge(obj1[p], obj2[p]);
		} else {
		    obj1[p] = obj2[p];
		}
	    } catch(e) {
		// Property in destination object not set; create it and set its value.
		obj1[p] = obj2[p];
	    }
	}

	return obj1;
    }

    // Export heatmap
    window.Heatmap = Heatmap;
})();
