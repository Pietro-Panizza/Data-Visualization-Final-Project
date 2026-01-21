const margin = {top: 40, right: 40, bottom: 60, left: 70};
const width = 1000 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

d3.csv("../../data/ai_models/all_ai_models.csv").then(function(data) {

    const parseDate = d3.timeParse("%Y-%m-%d");

    // 1. Data Cleaning & Filtering (Year >= 2004)
    const cleanData = data.map(d => {
        return {
            name: d["System"] || d["Model"],
            date: parseDate(d["Publication date"]),
            params:  +d["Parameters"],
            compute: +d["Training compute (FLOP)"],
            time:    +d["Training time (hours)"],
            dataset: +d["Training dataset size (gradients)"]
        };
    }).filter(d => d.date && d.date.getFullYear() >= 2004); 

    // 2. Draw standard scatterplots
    drawScatterplot("#chart-params", cleanData, d => d.params, "Parameters (Log)");
    drawScatterplot("#chart-compute", cleanData, d => d.compute, "Compute (FLOPs)");

    // 3. Draw the Bubble Chart
    drawBubbleChart("#chart-bubble", cleanData, 
        d => d.time,      // Y-axis
        d => d.dataset,   // Bubble Size
        "Training Time (Hours)", 
        "Dataset Size"
    );

}).catch(err => console.error("Error:", err));

// --- Reusable Scatterplot Function (STRICT OUTLINE RESTORED) ---
function drawScatterplot(selector, dataset, yAccessor, yLabel) {
    const chartData = dataset.filter(d => yAccessor(d) > 0);
    const {svg, x, y} = setupCanvas(selector, chartData, yAccessor, yLabel);

    svg.append('g')
        .selectAll("circle")
        .data(chartData)
        .join("circle")
        .attr("cx", d => x(d.date))
        .attr("cy", d => y(yAccessor(d)))
        .attr("r", 5)
        .attr("class", "dot")
        .style("fill", "#69b3a2")
        .style("stroke", "#ffffff") // Restored outline
        .style("stroke-width", "1px")
        .style("opacity", 0.8)
        .on("mouseover", function(event, d) {
            d3.select(this)
                .transition().duration(100)
                .attr("r", 8)
                .style("opacity", 1);
            showTooltip(event, `${d.name}<br>Value: ${d3.format(".2s")(yAccessor(d))}`);
        })
        .on("mouseout", function() {
            d3.select(this)
                .transition().duration(100)
                .attr("r", 5)
                .style("opacity", 0.8);
            hideTooltip();
        });
}

// --- Specific Bubble Chart Function ---
function drawBubbleChart(selector, dataset, yAccessor, rAccessor, yLabel, rLabel) {
    const chartData = dataset.filter(d => yAccessor(d) > 0 && rAccessor(d) > 0);
    const {svg, x, y} = setupCanvas(selector, chartData, yAccessor, yLabel);

    const r = d3.scaleSqrt()
        .domain([0, d3.max(chartData, d => rAccessor(d))])
        .range([3, 35]); // Slightly larger range for better visibility

    svg.append('g')
        .selectAll("circle")
        .data(chartData)
        .join("circle")
        .attr("cx", d => x(d.date))
        .attr("cy", d => y(yAccessor(d)))
        .attr("r", d => r(rAccessor(d)))
        .attr("class", "dot")
        .style("fill", "#4a90e2") 
        .style("fill-opacity", 0.6)
        .style("stroke", "#ffffff") // Restored outline
        .style("stroke-width", "1px")
        .on("mouseover", function(event, d) {
            d3.select(this).style("fill-opacity", 1).style("stroke-width", "2px");
            const content = `<strong>${d.name}</strong><br>Time: ${d3.format(".2s")(d.time)}h<br>Dataset: ${d3.format(".2s")(d.dataset)}`;
            showTooltip(event, content);
        })
        .on("mouseout", function() {
            d3.select(this).style("fill-opacity", 0.6).style("stroke-width", "1px");
            hideTooltip();
        });
}

// --- Helper: Setup SVG, Scales, and Axes ---
function setupCanvas(selector, chartData, yAccessor, yLabel) {
    const svg = d3.select(selector).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
        .domain(d3.extent(chartData, d => d.date))
        .range([0, width]);

    // Use a bit more padding in the domain so dots aren't cut off at the edges
    const y = d3.scaleLog()
        .domain([d3.min(chartData, d => yAccessor(d)) * 0.5, d3.max(chartData, d => yAccessor(d)) * 2])
        .range([height, 0]);

    svg.append("g").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(x));
    svg.append("g").call(d3.axisLeft(y).ticks(5, "~s"));

    svg.append("text").attr("x", width).attr("y", height + 45).text("Publication Date").attr("class", "axis-label").style("text-anchor", "end").style("fill", "white");
    svg.append("text").attr("transform", "rotate(-90)").attr("y", -50).attr("x", 0).text(yLabel).attr("class", "axis-label").style("text-anchor", "end").style("fill", "white");

    return {svg, x, y};
}

// --- Helper: Tooltip ---
function showTooltip(event, content) {
    d3.select("#tooltip")
        .style("opacity", 1)
        .html(content)
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 28) + "px");
}
function hideTooltip() { d3.select("#tooltip").style("opacity", 0); }