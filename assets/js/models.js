// Global Setup
const margin = {top: 40, right: 40, bottom: 60, left: 70};
const width = 1000 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Load Data Once
d3.csv("../../data/ai_models/all_ai_models.csv").then(function(data) {

    // 1. General Data Cleaning
    // We parse the common Date field here
    const parseDate = d3.timeParse("%Y-%m-%d");

    const cleanData = data.map(d => {
        return {
            name: d["System"] || d["Model"],
            date: parseDate(d["Publication date"]),
            
            // Parse the 3 variables we need. 
            // We use (+) to convert strings to numbers. 
            // If the cell is empty, it becomes 0 or NaN.
            params:  +d["Parameters"],
            compute: +d["Training compute (FLOP)"],
            time:    +d["Training time (hours)"]
        };
    }).filter(d => d.date); // Must have a date to be plotted

    // 2. Draw the 3 Charts
    // We pass: container ID, the data, the 'Y' property to access, and the label
    
    // Chart 1: Parameters
    drawScatterplot("#chart-params", cleanData, d => d.params, "Parameters (Log Scale)");

    // Chart 2: Compute
    drawScatterplot("#chart-compute", cleanData, d => d.compute, "Compute (FLOPs - Log Scale)");

    // Chart 3: Time
    drawScatterplot("#chart-time", cleanData, d => d.time, "Training Time (Hours - Log Scale)");

}).catch(function(error){
    console.log("Error loading the CSV file: ", error);
});


// --- Reusable Function to Draw Charts --- //
function drawScatterplot(selector, dataset, yAccessor, yLabel) {

    // 1. Filter Data for this specific chart
    // We remove entries where the specific Y value is 0, NaN, or missing
    const chartData = dataset.filter(d => {
        const val = yAccessor(d);
        return val && val > 0;
    });

    // 2. Setup SVG
    const svg = d3.select(selector)
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // 3. Scales
    
    // X Scale (Date)
    const x = d3.scaleTime()
        .domain(d3.extent(chartData, d => d.date))
        .range([0, width]);

    // Y Scale (Logarithmic)
    const y = d3.scaleLog()
        .domain([
            d3.min(chartData, d => yAccessor(d)) * 0.8, 
            d3.max(chartData, d => yAccessor(d)) * 1.5
        ]) 
        .range([height, 0]);

    // 4. Axes
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        .attr("class", "x-axis");

    svg.append("g")
        .call(d3.axisLeft(y).ticks(5, "~s")) // "~s" makes large numbers readable (e.g. 1G, 1T)
        .attr("class", "y-axis");

    // Labels
    svg.append("text")
        .attr("text-anchor", "end")
        .attr("x", width)
        .attr("y", height + 40)
        .text("Publication Date")
        .attr("class", "axis-label");

    svg.append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", -50)
        .attr("x", -height / 2 + 50)
        .text(yLabel)
        .attr("class", "axis-label");

    // 5. Circles
    const tooltip = d3.select("#tooltip");

    svg.append('g')
        .selectAll("circle")
        .data(chartData)
        .join("circle")
        .attr("cx", d => x(d.date))
        .attr("cy", d => y(yAccessor(d)))
        .attr("r", 5)
        .attr("class", "dot")
        .style("fill", "#69b3a2")
        .style("opacity", 0.7)
        .style("stroke", "#000")
        
        // Interactivity
        .on("mouseover", function(event, d) {
            const yValueFormatted = d3.format(".2s")(yAccessor(d));
            
            tooltip
                .style("opacity", 1)
                .html(`<strong>${d.name}</strong><br>
                       Date: ${d.date.toLocaleDateString()}<br>
                       Value: ${yValueFormatted}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
            
            d3.select(this).style("fill", "#ffcc00").attr("r", 8);
        })
        .on("mouseout", function() {
            tooltip.style("opacity", 0);
            d3.select(this).style("fill", "#69b3a2").attr("r", 5);
        });
}