const margin = {top: 40, right: 40, bottom: 60, left: 70};
const width = 1000 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// global variables for data and graphs
let allData = [];
let filteredData = [];
let currentMinYear = 1950;
let currentMaxYear = 2024;
let minDataYear = 1950;
let maxDataYear = 2024;

// debounce variable
let debounceTimer;

// Array to memorize the specific function
let chartUpdateFunctions = [];

d3.csv("../../data/ai_models/all_ai_models.csv").then(function(data) {
    const parseDate = d3.timeParse("%Y-%m-%d");

    // Process all data
    allData = data.map(d => {
        const date = parseDate(d["Publication date"]);
        return {
            name: d["System"] || d["Model"],
            date: date,
            year: date ? date.getFullYear() : null,
            params: +d["Parameters"],
            compute: +d["Training compute (FLOP)"],
            time: +d["Training time (hours)"],
            dataset: +d["Training dataset size (gradients)"]
        };
    }).filter(d => d.date);

    // Debug: check for data presence
    console.log("Dati caricati:", allData.length);
    if (allData.length === 0) {
        console.error("Nessun dato valido caricato!");
        return;
    }

    // find the year range in data
    const years = allData.map(d => d.year).filter(d => d !== null && !isNaN(d));
    
    if (years.length === 0) {
        console.error("Nessun anno valido nei dati!");
        return;
    }
    
    minDataYear = Math.min(...years);
    maxDataYear = Math.max(...years);
    
    console.log(`Range anni nei dati: ${minDataYear} - ${maxDataYear}`);
    
    // set initial range
    currentMinYear = minDataYear;
    currentMaxYear = maxDataYear;
    
    // initialize with all data
    filteredData = allData;
    
    // Create  slider
    createDualRangeSlider();
    
    // Inizialize  graphs
    initializeCharts();
    
}).catch(err => {
    console.error("Errore nel caricamento dei dati:", err);
    // Show the error message
    d3.select("main.container").append("div")
        .attr("class", "error-message")
        .style("color", "red")
        .style("padding", "20px")
        .html(`<h3>Errore nel caricamento dei dati</h3><p>${err.message}</p>`);
});

function createDualRangeSlider() {
    if (d3.select("#dual-slider-container").empty()) {
        console.log("Creazione slider...");
        
        const sliderContainer = d3.select("main.container")
            .insert("section", ".chart-section")
            .attr("id", "dual-slider-container")
            .attr("class", "slider-section");
        
        sliderContainer.append("h2")
            .text("Filter by Year Range")
            .style("color", "white");
        
        // slider container
        const sliderWrapper = sliderContainer.append("div")
            .attr("class", "slider-wrapper");
        
        sliderWrapper.append("div")
            .attr("class", "slider-track");
        
        const activeTrack = sliderWrapper.append("div")
            .attr("class", "slider-active-track");
        
        // Input range for minimum 
        const minSlider = sliderWrapper.append("input")
            .attr("type", "range")
            .attr("id", "min-slider")
            .attr("class", "range-slider")
            .attr("min", minDataYear)
            .attr("max", maxDataYear)
            .attr("value", currentMinYear)
            .style("z-index", "1");
        
        // Input range for maximum
        const maxSlider = sliderWrapper.append("div")
            .append("input")
            .attr("type", "range")
            .attr("id", "max-slider")
            .attr("class", "range-slider")
            .attr("min", minDataYear)
            .attr("max", maxDataYear)
            .attr("value", currentMaxYear)
            .style("z-index", "2");
        
        // Display values
        const valuesDisplay = sliderContainer.append("div")
            .attr("class", "slider-values");
        
        valuesDisplay.append("span")
            .attr("id", "min-value")
            .style("font-weight", "600")
            .text(currentMinYear);
        
        valuesDisplay.append("span")
            .attr("id", "max-value")
            .style("font-weight", "600")
            .text(currentMaxYear);
        
        // models counter 
        sliderContainer.append("div")
            .attr("id", "model-count")
            .style("font-size", "14px")
            .style("color", "rgba(255, 255, 255, 0.8)");
        
        // Compute position in pixels for a given year
        function yearToPixel(year) {
            const wrapper = sliderWrapper.node();
            if (!wrapper) return 0;
            const width = wrapper.offsetWidth;
            const range = maxDataYear - minDataYear;
            const percent = (year - minDataYear) / range;
            return percent * width;
        }
        
        // Determine which slider must handle the click basing on position
        function determineActiveSlider(clientX) {
            const wrapper = sliderWrapper.node();
            if (!wrapper) return "max";
            
            const rect = wrapper.getBoundingClientRect();
            const x = clientX - rect.left;
            
            const minPos = yearToPixel(currentMinYear);
            const maxPos = yearToPixel(currentMaxYear);
            
            // if click is nearer to left thumb, use min-slider
            const distToMin = Math.abs(x - minPos);
            const distToMax = Math.abs(x - maxPos);
            
            return distToMin < distToMax ? "min" : "max";
        }
        
        // update active track
        function updateActiveTrack() {
            const minPercent = ((currentMinYear - minDataYear) / (maxDataYear - minDataYear)) * 100;
            const maxPercent = ((currentMaxYear - minDataYear) / (maxDataYear - minDataYear)) * 100;
            
            activeTrack
                .style("left", `${minPercent}%`)
                .style("width", `${maxPercent - minPercent}%`);
        }
        
        // event handle
        sliderWrapper.on("mousedown touchstart", function(event) {
            const clientX = event.clientX || (event.touches && event.touches[0].clientX);
            
        });
        
        // Min slider
        minSlider.on("input", function() {
            let minVal = +this.value;
            const maxVal = +d3.select("#max-slider").property("value");
            
            // min should not be greater than max
            if (minVal > maxVal) {
                minVal = maxVal;
                this.value = maxVal;
            }
            
            currentMinYear = minVal;
            
            // visual update
            updateSliderDisplay();
            updateActiveTrack();
            
            // plots update
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                updateDataAndCharts();
            }, 100);
        });
        
        // Max slider
        maxSlider.on("input", function() {
            let maxVal = +this.value;
            const minVal = +d3.select("#min-slider").property("value");
            
            // min should not be greater than max
            if (maxVal < minVal) {
                maxVal = minVal;
                this.value = minVal;
            }
            
            currentMaxYear = maxVal;
            
            // visual update
            updateSliderDisplay();
            updateActiveTrack();
            
            // plots update
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                updateDataAndCharts();
            }, 100); 
        });
        
        // Inizialize
        updateActiveTrack();
        updateSliderDisplay();
    }
}

// --- Function to update slider visualization ---
function updateSliderDisplay() {
    d3.select("#min-value").text(currentMinYear);
    d3.select("#max-value").text(currentMaxYear);
    d3.select("#model-count").html(`
        Showing <strong>${filteredData.length}</strong> models from ${currentMinYear} to ${currentMaxYear}
    `);
}

// --- Function to filter data and update plots ---
function updateDataAndCharts() {
    filteredData = allData.filter(d => {
        const year = d.date.getFullYear();
        return year >= currentMinYear && year <= currentMaxYear;
    });
    
    updateSliderDisplay();
    
    // update every plot using updating function
    chartUpdateFunctions.forEach(updateFn => updateFn(filteredData));
}

// --- Function to initialize plots ---
function initializeCharts() {
    
    chartUpdateFunctions = [
        (data) => updateScatterplot("#chart-params", data, d => d.params, "Parameters (Log)"),
        (data) => updateScatterplot("#chart-compute", data, d => d.compute, "Compute (FLOPs)"),
        (data) => updateBubbleChart("#chart-bubble", data, d => d.time, d => d.dataset, "Training Time (Hours)", "Dataset Size")
    ];
    
    // Draw initial plots
    chartUpdateFunctions.forEach(fn => fn(filteredData));
}

// --- scatterplot update functiom ---
function updateScatterplot(selector, dataset, yAccessor, yLabel) {
    // Remove existing plot
    d3.select(selector).selectAll("svg").remove();
    
    const chartData = dataset.filter(d => yAccessor(d) > 0);
    if (chartData.length === 0) {
        console.log(`Nessun dato per ${selector}`);
        return;
    }
    
    const {svg, x, y} = setupCanvas(selector, chartData, yAccessor, yLabel);
    
    // Determine color based on the type of plot
    const color = selector === "#chart-params" ? "#69b3a2" : "#e69b3a";
    
    svg.append('g')
        .selectAll("circle")
        .data(chartData)
        .join("circle")
        .attr("cx", d => x(d.date))
        .attr("cy", d => y(yAccessor(d)))
        .attr("r", 5)
        .attr("class", "dot")
        .style("fill", color)
        .style("stroke", "#ffffff")
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

// --- bubble chart update function ---
function updateBubbleChart(selector, dataset, yAccessor, rAccessor, yLabel, rLabel) {
    // remove existing plot
    d3.select(selector).selectAll("svg").remove();
    
    const chartData = dataset.filter(d => yAccessor(d) > 0 && rAccessor(d) > 0);
    if (chartData.length === 0) {
        console.log(`Nessun dato per ${selector}`);
        return;
    }
    
    const {svg, x, y} = setupCanvas(selector, chartData, yAccessor, yLabel);
    
    const r = d3.scaleSqrt()
        .domain([0, d3.max(chartData, d => rAccessor(d))])
        .range([3, 35]);
    
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
        .style("stroke", "#ffffff")
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
    
    let xDomain;
    if (chartData.length > 0) {
        xDomain = d3.extent(chartData, d => d.date);
    } else {
        // if there are no data create a domain based on selected range
        xDomain = [
            new Date(currentMinYear + "-01-01"), 
            new Date(currentMaxYear + "-12-31")
        ];
    }
    
    const x = d3.scaleTime()
        .domain(xDomain)
        .range([0, width]);
    
    // if there are no date create a default domain
    const yDomain = chartData.length > 0 
        ? [d3.min(chartData, d => yAccessor(d)) * 0.5, d3.max(chartData, d => yAccessor(d)) * 2]
        : [1, 1000];
    
    const y = d3.scaleLog()
        .domain(yDomain)
        .range([height, 0]);
    
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x));
    
    svg.append("g")
        .call(d3.axisLeft(y).ticks(5, "~s"));
    
    // axis labels
    svg.append("text")
        .attr("x", width)
        .attr("y", height + 45)
        .text("Publication Date")
        .attr("class", "axis-label")
        .style("text-anchor", "end")
        .style("fill", "white");
    
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -50)
        .attr("x", 0)
        .text(yLabel)
        .attr("class", "axis-label")
        .style("text-anchor", "end")
        .style("fill", "white");
    
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

function hideTooltip() { 
    d3.select("#tooltip").style("opacity", 0); 
}