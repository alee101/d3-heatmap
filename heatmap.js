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

	// Text to show as row label, where rl is an element
	// from rowLabels and i is its index in that array
	rowLabelText: function(rl, i) { return rl; },

	// Text to show as col label, where cl is an element
	// from colLabels and i is its index in that array
	colLabelText: function(cl, i) { return cl; },

	displayLegend: true,

	// Width of each legend element, in pixels
	legendEleWidth: 40,

	// Height of each legend element, in pixels
	legendEleHeight: 10,

	// Whether to determine thresholds for legend colors automatically based on data
	legendAutoThreshold: false,

	// Thresholds for legendColors if legendAutoThreshold is false
	legendThresholds: [0, 2, 4, 6, 8],

	legendColors: ['#eee', '#d6e685', '#8cc665', '#44a340', '#1e6823'],

	// Url to fetch JSON data from or JSON object
	data: {},

	// Whether to focus on cell when clicked
	focusOnClick: false,

	// Callback when clicking on a cell
	onClick: null,

	// Callback when mousing over a cell
	onMouseover: null,

	// Callback when mousing out of a cell
	onMouseout: null,

	// Whether to display tooltips when hovering over cells
	tooltip: false,

	// Text to display in tooltip if tooltip is true
	tooltipText: function(d) {
	    return 'Value: ' + d.value;
	}
    };

    function Heatmap(settings) {
	settings = settings || {};
	this.settings = extend({}, defaults, settings);

	// Compute dimensions
	this.margin = { top: 30, right: 0, bottom: 30, left: 40 };
	this.fullCellSize = this.settings.cellSize + this.settings.cellPadding;
	this.dim = {
	    'width': this.margin.left + this.margin.right +
		this.fullCellSize * this.settings.colLabels.length,
	    'height': this.margin.top + this.margin.bottom +
		this.fullCellSize * this.settings.rowLabels.length +
		(this.settings.displayLegend ? this.settings.legendEleHeight + this.margin.bottom : 0)
	};

	// Load data and initialize chart with data
	if (typeof this.settings.data === 'string') {
	    d3.json(this.settings.data, function(err, data) {
		if (err) {
		    throw err;
		}

		this.data = data.map(function(d) {
		    return {
			row: +d.row,
			col: +d.col,
			value: +d.value
		    };
		});

		this.init();
	    }.bind(this));
	} else if (typeof this.settings.data === 'object') {
	    this.data = this.settings.data.map(function(d) {
		return {
		    row: +d.row,
		    col: +d.col,
		    value: +d.value
		};
	    });

	    this.init();
	}
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
		.text(function(rl, i) { return this.settings.rowLabelText.call(this, rl, i); }.bind(this))
		.attr('x', 0)
		.attr('y', function(rl, i) { return i * this.fullCellSize; }.bind(this))
		.style('text-anchor', 'end')
		.attr('transform', 'translate(-6,' + this.settings.cellSize / 1.5 + ')')
		.attr('class', 'rowLabel mono axis');

	    var colLabels = this.svg.selectAll('.colLabel')
		.data(this.settings.colLabels)
		.enter().append('text')
		.text(function(cl, i) { return this.settings.colLabelText.call(this, cl, i); }.bind(this))
		.attr('x', function(cl, i) { return i * this.fullCellSize; }.bind(this))
		.attr('y', 0)
		.style('text-anchor', 'middle')
		.attr('transform', 'translate(' + this.settings.cellSize / 2 + ', -6)')
		.attr('class', 'colLabel mono axis');

	    var heatmapChart = this.svg.selectAll('.cell')
		.data(this.data)
		.enter().append('rect')
		.attr('x', function(d) { return (d.col - 1) * this.fullCellSize; }.bind(this))
		.attr('y', function(d) { return (d.row - 1) * this.fullCellSize; }.bind(this))
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

		    this.settings.onMouseover.call(this, cell);
		}.bind(this))
		.on('mouseout', function(cell) {
		    if (this.settings.tooltip) {
			this.tooltip.hide(cell);
		    }

		    this.settings.onMouseout.call(this, cell);
		}.bind(this));

	    // Fill cells
	    heatmapChart.transition().duration(1000)
		.style('fill', function(d) { return this.colorScale(d.value) }.bind(this));

	    this.heatmapChart = heatmapChart;
	},

	// Focus on the cells with specified row, column coordinates
	// cellCoords: Array of {'row': r, 'col': c} objects.
	// Rows and columns are indexed from 1
	selectCells: function(cellCoords) {
	    if (!cellCoords) cellCoords = [];

	    /* Build a mapping of a (row, col) cell to a single cellHash
	       for simpler membership lookup.
	       For rows and columns indexed starting at 1, an unique mapping is:
	         tableIdx = (row - 1) * numCols + (col - 1)
	    */
	    var numCols = this.settings.colLabels.length;
	    var cellHash = function(cell) {
		return (cell.row-1) * numCols + (cell.col-1);
	    };

	    var selectedCellHashes = cellCoords.map(cellHash);
	    this.heatmapChart.each(function(cell) {
		var cellDiv = d3.select(this);
		if (selectedCellHashes.indexOf(cellHash(cell)) === -1) {
		    cellDiv.attr('class', 'cell focusout');
		} else {
		    cellDiv.attr('class', 'cell focus');
		}
	    });
	},

	// Restore heatmap to original state by clearing selection and focus
	clearSelection: function() {
	    this.heatmapChart.each(function(cell) {
		var cellDiv = d3.select(this);
		cellDiv.attr('class', 'cell');
	    });
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
     * Mimic jQuery's extend method: first argument
     * is the target object to merge into and following
     * arguments are objects to merge into target.
     */
    function extend() {
	var target = arguments[0] || {};
	for (var i = 1; i < arguments.length; i++) {
            for (var prop in arguments[i]) {
		if (arguments[i].hasOwnProperty(prop)) {
                    target[prop] = arguments[i][prop];
		}
	    }
	}

	return target;
    }

    // Export heatmap
    window.Heatmap = Heatmap;
})();
