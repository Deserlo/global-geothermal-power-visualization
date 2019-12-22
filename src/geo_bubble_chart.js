/* bubbleChart creation function. Returns a function that will
 * instantiate a new bubble chart given a DOM element to display
 * it in and a dataset to visualize.
 *
 * Organization and style inspired by:
 * https://bost.ocks.org/mike/chart/
 *
 */

function bubbleChart() {
  // Constants for sizing
  var width = 1040;
  var height = 620;
  var titleCush = 70;
  var rowCush = 40;
  var col_1 = 80;
  var col_2 = width/3;
  var col_3 = 1.75*(width/3);
  var col_4 = width-200;
  var row_1 = 100;
   var row_2 = height/3+25;
  var row_3 = 2*(height/3);
  var totalPlants;
  var totalCap;
  var maxCap;

  

  

  // tooltip for mouseover functionality
  var tooltip = floatingTooltip('gates_tooltip', 240);

  // Locations to move bubbles towards, depending
  // on which view mode is selected.
  var center = { x: width / 4, y: height/3 };


   var turbineCenters = {
	'Back pressure': { x: col_1+20, y: row_1+rowCush },
	'Double flash': { x: col_2, y: row_1+rowCush },
	'Dry steam': { x: col_3, y: row_1+rowCush},
	'Hybrid': { x: col_1+20, y: row_2+titleCush},
    'Kalina': { x: col_2, y: row_2+titleCush },
    'ORC': { x: col_3, y: row_2+titleCush },
	'Other': { x: col_1+20, y: row_3+titleCush },
	'Single flash': { x: col_2, y: row_3+titleCush+10 },
	'Triple flash': { x: col_3, y: row_3+titleCush },
	'unknown': { x: col_4-20, y: row_3+titleCush }
  };

  // X,Y locations of the turbine type titles.
  var turbineTitlePos = {
	'Back pressure': { x: col_1, y: row_1-titleCush},
	'Double flash': {x: col_2, y: row_1-titleCush},
	'Dry steam': {x: col_3, y: row_1-titleCush},
	'Hybrid': {x: col_1, y: row_2},
	'Kalina': {x: col_2, y: row_2},
	'Organic Rankin Cycle': {x: col_3, y: row_2},
	'Other': {x: col_1, y:row_3},
	'Single flash': {x: col_2, y: row_3},
	'Triple flash': {x: col_3, y: row_3},
	'Unknown': {x: col_4, y: row_3}
  };
  
   var turbineDescription = {
	'Dry Steam': "Dry steam power plants draw from underground resources of steam." + 
	 "The steam is piped directly from underground wells to the power plant where it" + 
	 "is directed into a turbine/generator unit. An example of dry steam geothermal plants is the Geysers in northern California.",
	'Organic Rankin Cycle': "Unlike dry steam and flash steam power plants, binary cycle power plants "+
	"(Organic Rankin Cycle) allows cooler geothermal reservoirs to be used (225-360F (107-182C))."+ 
	"Binary cycle plants use the heat from the hot water to boil a working fluid, usually an organic compound "+
	"with a low boiling point. The working fluid is vaporized in a heat exchanger and used to turn a turbine. "+
	"The water is then injected back into the ground to be reheated. The water and the working fluid are kept " +
	"separated during the whole process, so there are little or no air emissions.",
	'Flash': "Flash steam power plants are the most common and use geothermal reservoirs of water with temperatures greater than 360F (182C)." +
	  "This very hot water flows up through wells in the ground under its own pressure. As it flows upward, the pressure decreases and some of " +
	   "the hot water boils into steam. The steam is then separated from the water and used to power a turbine/generator. " +
	   "Any leftover water and condensed steam are injected back into the reservoir, making this a sustainable resource.",
	'Other': "Hybrid, Kalina, and Back Pressure plants fall into this category."
  };
 
  var yearRangeTitlePos = {
	'Pre-2000': {x: 50, y: 150 },
	'2000-2010':{x: 50, y: 300 },
	'Post-2010':{x: 50, y: 430 }	
  };
  
  var typesYearRangeTitlePos = {
	  'Flash': { x: 246, y: 50},
	  'Organic Rankin Cycle': {x: 446, y: 50},
	  'Dry Steam': {x: 646, y: 50},
	  'Other': {x: 800, y: 50}
  };
  
  
  
  
  
  // @v4 strength to apply to the position forces
  var forceStrength = 0.03;

  // These will be set in create_nodes and create_vis
  var svg = null;
  var bubbles = null;
  var nodes = [];

  // Charge function that is called for each node.
  // As part of the ManyBody force.
  // This is what creates the repulsion between nodes.
  //
  // Charge is proportional to the diameter of the
  // circle (which is stored in the radius attribute
  // of the circle's associated data.
  //
  // This is done to allow for accurate collision
  // detection with nodes of different sizes.
  //
  // Charge is negative because we want nodes to repel.
  // @v4 Before the charge was a stand-alone attribute
  //  of the force layout. Now we can use it as a separate force!
  function charge(d) {
    return -Math.pow(d.radius, 2.0) * forceStrength;
  }

  // Here we create a force layout and
  // @v4 We create a force simulation now and
  //  add forces to it.
  var simulation = d3.forceSimulation()
    .velocityDecay(0.2)
    .force('x', d3.forceX().strength(forceStrength).x(center.x))
    .force('y', d3.forceY().strength(forceStrength).y(center.y))
    .force('charge', d3.forceManyBody().strength(charge))
    .on('tick', ticked);

  // @v4 Force starts up automatically,
  //  which we don't want as there aren't any nodes yet.
  simulation.stop();

  // Nice looking colors - no reason to buck the trend
  // @v4 scales now have a flattened naming scheme
  var fillColor = d3.scaleOrdinal()
    .domain(['low', 'medium', 'high'])
    .range(['#7aa25c', '#7aa25c', '#7aa25c']);
	



  /*
   * This data manipulation function takes the raw data from
   * the CSV file and converts it into an array of node objects.
   * Each node will store data and visualization values to visualize
   * a bubble.
   *
   * rawData is expected to be an array of data objects, read in from
   * one of d3's loading functions like d3.csv.
   *
   * This function returns the new node array, with a node in that
   * array for each element in the rawData input.
   */
  function createNodes(rawData) {
    // Use the max total_amount in the data as the max in the scale's domain
    // note we have to ensure the total_amount is a number.

	var maxCapacity = d3.max(rawData, function (d) { 
		return +d.ini_cap_ele; });
	
	maxCap = maxCapacity;
	
    // Sizes bubbles based on area.
    // @v4: new flattened scale names.
    var radiusScale = d3.scalePow()
      .exponent(.6)
      .range([2, 15])
	  .domain([0, maxCapacity]);

    // Use map() to convert raw data into node data.
    // Checkout http://learnjsdata.com/ for more on
    // working with data.
	var myNodes = rawData.map(function (d) {
      return {
        name: d.name_powerplant,
        radius: radiusScale(+d.ini_cap_ele),
        value: +d.ini_cap_ele,
		capacity: +d.ini_cap_ele,
        country: d.name_country,
        turbine: d.name_turbine_type,
		year: d.start_year,
        x: Math.random() * 900,
        y: Math.random() * 800
      };
    });

    // sort them to prevent occlusion of smaller nodes.
    myNodes.sort(function (a, b) { return b.value - a.value; });

    return myNodes;
  }
  


  /*
   * Main entry point to the bubble chart. This function is returned
   * by the parent closure. It prepares the rawData for visualization
   * and adds an svg element to the provided selector and starts the
   * visualization creation process.
   *
   * selector is expected to be a DOM element or CSS selector that
   * points to the parent element of the bubble chart. Inside this
   * element, the code will add the SVG continer for the visualization.
   *
   * rawData is expected to be an array of data objects as provided by
   * a d3 loading function like d3.csv.
   */
  var chart = function chart(selector, rawData) {
    // convert raw data into nodes data
    nodes = createNodes(rawData);
	var numPlants = 0;
	var totalCapacity = d3.sum(rawData, function (d) { 
		numPlants = numPlants + 1;
		return +d.ini_cap_ele; });
	totalCap = totalCapacity;
	totalPlants = numPlants;

    // Create a SVG element inside the provided selector
    // with desired size.
    svg = d3.select(selector)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Bind nodes data to what will become DOM elements to represent them.
    bubbles = svg.selectAll('.bubble')
      .data(nodes, function (d) { return d.name; });

    // Create new circle elements each with class `bubble`.
    // There will be one circle.bubble for each object in the nodes array.
    // Initially, their radius (r attribute) will be 0.
    // @v4 Selections are immutable, so lets capture the
    //  enter selection to apply our transtition to below.
    var bubblesE = bubbles.enter().append('circle')
      .classed('bubble', true)
      .attr('r', 0)
      .attr('fill', function (d) { return fillColor(+d.capacity); })
      .attr('stroke', function (d) { return d3.rgb(fillColor(+d.capacity)).darker(); })
      .attr('stroke-width', 2)
      .on('mouseover', showDetail)
      .on('mouseout', hideDetail);

    // @v4 Merge the original empty selection and the enter selection
    bubbles = bubbles.merge(bubblesE);

    // Fancy transition to make bubbles appear, ending with the
    // correct radius
    bubbles.transition()
      .duration(2000)
      .attr('r', function (d) { return d.radius; });

    // Set the simulation's nodes to our newly created nodes array.
    // @v4 Once we set the nodes, the simulation will start running automatically!
    simulation.nodes(nodes);

    // Set initial layout to single group.
    groupBubbles();
	showTotalCapacity(totalCapacity, numPlants);
	
	drawLegend();
  };

  /*
   * Callback function that is called after every tick of the
   * force simulation.
   * Here we do the acutal repositioning of the SVG circles
   * based on the current x and y values of their bound node data.
   * These x and y values are modified by the force simulation.
   */
  function ticked() {
    bubbles
      .attr('cx', function (d) { return d.x; })
      .attr('cy', function (d) { return d.y; });
  }

  /*
   * Provides a x value for each node to be used with the split by turbine
   * x force.
   */
  function nodeTurbinePosX(d) {
    return turbineCenters[d.turbine].x;
  }
  
    /*
   * Provides a Y value for each node to be used with the split by turbine
   * Y force.
   */
  function nodeTurbinePosY(d) {
    return turbineCenters[d.turbine].y;
  }
  
   /*
   * Provides a x value for each node to be used with the split by ...
   * x force.
   */
  function nodeTurbineTrendPosX(d) {
	  if (d.turbine == 'ORC'){
		return 435;
	  }
	  else if (d.turbine =='Single flash' || d.turbine == 'Double flash' || d.turbine == 'Triple flash') {
		  return 255;
	  }
	  else if (d.turbine == 'Dry steam'){
		return 620;
	  }
	  else {
		  return 770;
	  }
  }
  
    /*
   * Provides a y value for each node to be used with the split by ...
   * y force.
   */
  function nodeTurbineTrendPosY(d) {
	  if (d.year < 2000){
		return 170;
	  }
	  else if (d.year >= 2000 && d.year <= 2010)  {
		  return 280;
	  }
	  else if (d.year > 2010){
		  return 390;
	  }
	  else {
		  return 500;
	  }
  }
  
  /*
   * Sets visualization in "single group mode".
   * The year labels are hidden and the force layout
   * tick function is set to move all nodes to the
   * center of the visualization.
   */
  function groupBubbles() {
	hideTurbineTrendTitles();
    hideTypeTitles();
	unhideTotalCapacity();
	hideYearRangeTitles();

    // @v4 Reset the 'x' force to draw the bubbles to the center.
    simulation.force('x', d3.forceX().strength(forceStrength).x(center.x));
	simulation.force('y', d3.forceY().strength(forceStrength).y(center.y));

    // @v4 We can reset the alpha value and restart the simulation
    simulation.alpha(1).restart();
  }


  /*
   * Sets visualization in "split by year mode".
   * The year labels are shown and the force layout
   * tick function is set to move nodes to the
   * yearCenter of their data's year.
   */
  function splitBubblesType() {
    showTypeTitles();
	hideTotalCapacity();
	hideYearRangeTitles();
	hideTurbineTrendTitles();
	unhideTypeTitle();

    // @v4 Reset the 'x' force to draw the bubbles to their centers
    simulation.force('x', d3.forceX().strength(forceStrength).x(nodeTurbinePosX));
	simulation.force('y', d3.forceY().strength(forceStrength).y(nodeTurbinePosY));

    // @v4 We can reset the alpha value and restart the simulation
    simulation.alpha(1).restart();
  }
  
	function splitBubblesTrend() {
		showTurbineTrendTitles();
		hideTypeTitles();
		hideTotalCapacity();
		showYearRangeTitles();
		unhideYearRangeTitles();
		unhideTurbineTrendTitles();
		
		// @v4 Reset the 'x' force to draw the bubbles to their centers
		simulation.force('x', d3.forceX().strength(forceStrength).x(nodeTurbineTrendPosX));
		simulation.force('y', d3.forceY().strength(forceStrength).y(nodeTurbineTrendPosY));

		// @v4 We can reset the alpha value and restart the simulation
		simulation.alpha(1).restart();	
	
	}
  
  /*
   * Hides Year title displays.
   */
  function hideTypeTitles() {
    svg.selectAll('.type').style("visibility", "hidden");
  }
  
  function unhideTypeTitle(){
	  svg.selectAll('.type').style("visibility", "visible");
  }

  /*
   * Shows Year title displays.
   */
function showTypeTitles() {
    // Another way to do this would be to create
    // the year texts once and then just hide them.
    var turbineData = d3.keys(turbineTitlePos);
	var turbineDescriptionData = d3.keys(turbineDescription);
    var years = svg.selectAll('.type')
      .data(turbineData);

    years.enter().append('text')
      .attr('class', 'type')
      .attr('x', function (d) { return turbineTitlePos[d].x; })
      .attr('y', function (d) { return turbineTitlePos[d].y; })
      .attr('text-anchor', 'middle')
      .text(function (d) { return d; });
	  //.on('mouseover', showTypeDetail)
      //.on('mouseout', hideTypeDetail);
  }
  
 function showTurbineTrendTitles() {
    // Another way to do this would be to create
    // the year texts once and then just hide them.
	svg.append('text')
	.attr('class', 'instr')
	.attr('x', 400)
	.attr('y', 10)
	.attr('text-anchor', 'right')
	.text("(Hover over Type to learn more about it)");  
	
	
    var turbineData = d3.keys(typesYearRangeTitlePos);
	var turbineDescriptionData = d3.keys(turbineDescription);
    var rangeCategories = svg.selectAll('.date-range')
      .data(turbineData);

    rangeCategories.enter().append('text')
      .attr('class', 'date-range')
      .attr('x', function (d) { return typesYearRangeTitlePos[d].x; })
      .attr('y', function (d) { return typesYearRangeTitlePos[d].y; })
      .attr('text-anchor', 'middle')
      .text(function (d) { return d; })
	  .on('mouseover', showTypeDetail)
      .on('mouseout', hideTypeDetail);
  }
  
  function unhideTurbineTrendTitles(){
	  svg.selectAll('.date-range').style("visibility", "visible");
	  svg.selectAll(".instr").style("visibility", "visible");
  }

  function hideTurbineTrendTitles(){
	  svg.selectAll('.date-range').style("visibility", "hidden");
	  svg.selectAll(".instr").style("visibility", "hidden");
  }
  
  
  
    /*
   * Shows Year Range title displays.
   */
  function showYearRangeTitles() {
    // Another way to do this would be to create
    // the year texts once and then just hide them.
    var yearsData = d3.keys(yearRangeTitlePos);
    var years = svg.selectAll('.year')
      .data(yearsData);

    years.enter().append('text')
      .attr('class', 'year')
      .attr('x', function (d) { return yearRangeTitlePos[d].x; })
      .attr('y', function (d) { return yearRangeTitlePos[d].y; })
      .attr('text-anchor', 'middle')
      .text(function (d) { return d; });
  }
  
  
   function unhideYearRangeTitles(){
	  svg.selectAll('.year').style("visibility", "visible");
  }

  function hideYearRangeTitles(){
	  svg.selectAll('.year').style("visibility", "hidden");
  }
  

    
  function showTotalCapacity(totalCapacity, totalPlants) {
 	svg.append('text')
	.attr('class', 'total')
	.attr('x', 350)
	.attr('y', 120)
	.attr('text-anchor', 'right')
	.text("As of 2017, there were " + totalPlants);  
	
	svg.append('text')
	.attr('class', 'total')
	.attr('x', 360)
	.attr('y', 150)
	.text('total Geothermal power');
	
 	svg.append('text')
	.attr('class', 'total')
	.attr('x', 380)
	.attr('y', 180)
	.attr('text-anchor', 'right')
	.text("plants with an installed ");  
	
	svg.append('text')
	.attr('class', 'total')
	.attr('x', 380)
	.attr('y', 210)
	.attr('font-size', 36)
	.text("capacity of");
	
	svg.append('text')
	.attr('class', 'totalCap')
	.attr('x', 570)
	.attr('y', 210)
	.attr('font-size', 36)
	.attr('fill', 'red')
	.text(totalCapacity);
	
	svg.append('text')
	.attr('class', 'total')
	.attr('x', 380)
	.attr('y', 240)
	.text(' mega watts of energy.');
  }
   
  function unhideTotalCapacity(){
	  svg.selectAll('.total').style("visibility", "visible");
	  svg.selectAll('.totalCap').style("visibility", "visible");
  }

  function hideTotalCapacity(){
	  svg.selectAll('.total').style("visibility", "hidden");
	  svg.selectAll('.totalCap').style("visibility", "hidden");
  }

  /*
   * Function called on mouseover to display the
   * details of a bubble in the tooltip.
   */
  function showDetail(d) {
    // change outline to indicate hover state.
    d3.select(this).attr('stroke', 'black');

    var content =  '<span class="name">Name: </span><span class ="value">' +
				   d.name + 
				   '</span><br/>' +
				  '<span class="name">Capacity: </span><span class="value">' +
                    +d.capacity + '(MWe)'+
                  '</span><br/>' +
                  '<span class="name">Country: </span><span class="value">' +
                  d.country +
                  '</span><br/>' +
				  '<span class="name">Start Year: </span><span class="value">' +
				  d.year +
				  '</span><br/>' +
                  '<span class="name">Turbine: </span><span class="value">' +
                  d.turbine +
                  '</span>';

    tooltip.showTooltip(content, d3.event);
  }
  
    function showTypeDetail(d) {
    // change outline to indicate hover state.
    d3.select(this).attr('stroke', 'black');

    var content =  '<span class="name">' + turbineDescription[d] + '</span>';

    tooltip.showTooltip(content, d3.event);
  }

  /*
   * Hides tooltip
   */
  function hideDetail(d) {
    // reset outline
    d3.select(this)
      .attr('stroke', d3.rgb(fillColor(+d.capacity)).darker());

    tooltip.hideTooltip();
  }
  
   function hideTypeDetail(d) {
	// reset outline
    d3.select(this)
      .attr('stroke', d3.rgb(fillColor(+d.capacity)).darker());
  
    tooltip.hideTooltip();
  }

 function drawLegend(){
	    var radiusScale = d3.scalePow()
      .exponent(.6)
      .range([2, 15])
	  .domain([0, maxCap]);
	//var linearSize = d3.scaleLinear().domain([0, maxCap]).range([0, 5]);

	var svg = d3.select("svg");

	svg.append("g")
	  .attr("class", "legendSize")
	  .attr("fill", '#7aa25c')
	  //.attr('stroke', 'rgb(85, 113, 64)')
      //.attr('stroke-width', 2)
	  .attr("transform", "translate(880, 10)");

	var legendSize = d3.legendSize()
	  //.scale(linearSize)
	  .scale(radiusScale)
	  .title("Plant Capacity (MwE)")
	  .shape('circle')
	  .shapePadding(10)
	  .labelOffset(10)
	  .orient('vertical');

	svg.select(".legendSize")
	  .call(legendSize);
	  
  }
  
  /*
   * Externally accessible function (this is attached to the
   * returned chart function). Allows the visualization to toggle
   * between "single group" and "split by year" modes.
   *
   */
  chart.toggleDisplay = function (displayName) {
    if (displayName === 'type') {
      splitBubblesType();
	  document.getElementById('vis').style.height = "600px";
	  document.getElementById('story-trend').style.visibility = "hidden";
    } else if (displayName == 'all') {
      groupBubbles();
	  document.getElementById('vis').style.height = "350px";
	  document.getElementById('story-trend').style.visibility = "hidden";
    }
	else if (displayName == 'trends') {
		splitBubblesTrend();
		document.getElementById('story-trend').style.visibility = "visible";
		document.getElementById('vis').style.height = "500px";
  }
  };
  // return the chart function from closure.
  return chart;
 
 }
/*
 * Below is the initialization code as well as some helper functions
 * to create a new bubble chart instance, load the data, and display it.
 */

var myBubbleChart = bubbleChart();

/*
 * Function called once data is loaded from CSV.
 * Calls bubble chart function to display inside #vis div.
 */
function display(error, data) {
  if (error) {
    console.log(error);
  }
  myBubbleChart('#vis', data);
  console.log(data[0]);
}

/*
 * Sets up the layout buttons to allow for toggling between view modes.
 */
function setupButtons() {
  d3.select('#toolbar')
    .selectAll('.button')
    .on('click', function () {
      // Remove active class from all buttons
      d3.selectAll('.button').classed('active', false);
      // Find the button just clicked
      var button = d3.select(this);

      // Set it as the active button
      button.classed('active', true);

      // Get the id of the button
      var buttonId = button.attr('id');

      // Toggle the bubble chart based on
      // the currently clicked button.
      myBubbleChart.toggleDisplay(buttonId);
    });
}




// Load the data.
d3.csv('data/JRC-GEOPP-DB.csv', display);
//d3.csv('data/geothermal_plant_data.csv', display);

// setup the buttons.
setupButtons();



