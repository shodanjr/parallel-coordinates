pc.autoscale = function() {
  // yscale
  var defaultScales = {
    "date": function(k) {
      return d3.time.scale()
        .domain(d3.extent(__.data, function(d) {
          return d[k] ? d[k].getTime() : null;
        }))
        .range([h()+1, 1]);
    },
    "number": function(k) {
      var scale = d3.scale.linear()
        .domain(d3.extent(__.data, function(d) { return +d[k]; }))
        .range([h()+1, 1]);
      scale.type = 'LINEAR';
      return scale;
    },
    "string": function(k) {
      var counts = {},
          domain = [];

      // Let's get the count for each value so that we can sort the domain based
      // on the number of items for each value.
      __.data.map(function(p) {
        if (counts[p[k]] === undefined) {
          counts[p[k]] = 1;
        } else {
          counts[p[k]] = counts[p[k]] + 1;
        }
      });

      domain = Object.getOwnPropertyNames(counts).sort(function(a, b) {
        return counts[a] - counts[b];
      });

      return d3.scale.ordinal()
        .domain(domain)
        .rangePoints([h()+1, 1]);
    }
  };

  __.dimensions.forEach(function(k) {
    yscale[k] = defaultScales[__.types[k]](k);
  });

  __.hideAxis.forEach(function(k) {
    yscale[k] = defaultScales[__.types[k]](k);
  });

  // hack to remove ordinal dimensions with many values
  pc.dimensions(pc.dimensions().filter(function(p,i) {
    var uniques = yscale[p].domain().length;
    if (__.types[p] == "string" && (uniques > 60 || uniques < 1)) {
      return false;
    }
    return true;
  }));

  // xscale
  xscale.rangePoints([0, w()], 1);

  // canvas sizes
  pc.selection.selectAll("canvas")
      .style("margin-top", __.margin.top + "px")
      .style("margin-left", __.margin.left + "px")
      .attr("width", w()+2)
      .attr("height", h()+2);

  // default styles, needs to be set when canvas width changes
  ctx.foreground.strokeStyle = __.color;
  ctx.foreground.lineWidth = 1.4;
  ctx.foreground.globalCompositeOperation = __.composite;
  ctx.foreground.globalAlpha = __.alpha;
  ctx.highlight.lineWidth = 3;
  ctx.shadows.strokeStyle = "#dadada";

  return this;
};

pc.scale = function(d, domain) {
	yscale[d].domain(domain);

	return this;
};

pc.toggleLogScale = function(d) {
	console.log('autoscale' + d);
	var curScale = yscale[d];
	if (!curScale.hasOwnProperty('type')) {
		// this should only work for numerical scales
		return this;
	}
	var extent = d3.extent(__.data, function(datum) { return +datum[d]; });
	if (curScale.type === 'LINEAR') {
		// log() is not defined for x === 0 so we hack this with a small offset
		if (extent[0] === 0) {
			extent[0] += 0.05;
		}
		yscale[d] = d3.scale.log()
		.domain(extent)
		.range([h()+1, 1]);
		yscale[d].type = 'LOG';
	} else if (curScale.type === 'LOG') {
		yscale[d] = d3.scale.linear()
		.domain(extent)
		.range([h()+1, 1]);
		yscale[d].type = 'LINEAR';
	} 
	return this;
};

pc.flip = function(d) {
	//yscale[d].domain().reverse();					// does not work
	yscale[d].domain(yscale[d].domain().reverse()); // works

	return this;
};

pc.commonScale = function(global, type) {
	var t = type || "number";
	if (typeof global === 'undefined') {
		global = true;
	}

	// scales of the same type
	var scales = __.dimensions.concat(__.hideAxis).filter(function(p) {
		return __.types[p] == t;
	});

	if (global) {
		var extent = d3.extent(scales.map(function(p,i) {
				return yscale[p].domain();
			}).reduce(function(a,b) {
				return a.concat(b);
			}));

		scales.forEach(function(d) {
			yscale[d].domain(extent);
		});

	} else {
		scales.forEach(function(k) {
			yscale[k].domain(d3.extent(__.data, function(d) { return +d[k]; }));
		});
	}

	// update centroids
	if (__.bundleDimension !== null) {
		pc.bundleDimension(__.bundleDimension);
	}

	return this;
};