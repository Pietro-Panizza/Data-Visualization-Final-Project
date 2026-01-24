# Artificial Intelligence: Where Are We Now?

*University of Genova* | *Course:* Data Visualization (2025/2026)  
*Group:* iPanda

## Live Website
**[[GitHub repository](https://github.com/Pietro-Panizza/Data-Visualization-Final-Project/blob/main/README.md)]**

## Project Overview
Artificial Intelligence has evolved from a niche academic discipline into a global force. This project visualizes this evolution through four distinct perspectives, creating a comprehensive narrative on the state of AI.

The website explores:
1.  *Models:* The technical evolution of algorithms (Size, Compute, Training Time).
2.  *Performance:* Analysis of standardized benchmarks to measure reasoning capabilities.
3.  *Investments:* A geospatial analysis of global data centers.
4.  *Socio-Environmental Impact:* The carbon footprint of training models and societal concerns regarding automation.

## Project Structure
Here is the actual organisation of files in the repository.

<pre>  
Data-Visualization-Final-Project
├── index.html                                   #landing page                          
├── LICENSE                                
├── README.md                                    #project documentation             
├── assets/                 
│   ├── css/  
│   │   ├── style.css                            #global styles               
│   │   └── pages.css                            #bubpages common styles
│   └── js/  
│       ├── models.js                            #plots of models section
│       ├── polarChart.js                        #polarchart of benchmarks section
│       ├── barChart.js                          #barchart of benchmark section
│       ├── streamgraph.js                       #environmental impact chart
│       └── Linechart.js                         #social impact chart
│   
├── images/                                
├── data/                                  
│   ├── ai_models/                               #data on ai models
│   ├── benchmark_data/                          #data on benchmark
│   ├── data_centers/                            #data on data centers
│   ├── americans-worry-work-being-automated.csv #data on social impact
│   └── llm-energy-use.csv                       #data on ai energy consumption 
└── pages/                                 
    ├── benchmark-details.css                    #style of benchmark page
    ├── benchmark-details.html                   #benchmark page
    ├── details-bench.html                       #benchmark explanation page
    ├── investments-details.html                 #investment page
    ├── social-environmental-impacts.css         #style of impact page
    ├── socio-environment-details.html           #impact page
    └── models-details.html                      #models page
</pre>

## Reproducibility and Local Setup

To view the project locally, a local web server is required. It's possible to use two different methods

### Method 1: VS Code (what we used)

1. Open the project folder in *Visual Studio Code*.
2. Use *"Live Server"* extension.
3. Right-click on index.html e select *"Open with Live Server"*.

### Method 2: Python Terminal

Run this command in the project folder:

bash  
python -m http.server 8000

Then go to http://localhost:8000.

---

## Data Preprocessing


All datasets used in this study were partially preprocessed by the original data providers. Additional, limited preprocessing was performed in JavaScript for each visualization.

---

## Data sources

* **[[EPOCH AI](https://epoch.ai/)]** Data on parameter, compute and benchmark.
* **[[Our World in Data](https://ourworldindata.org/grapher/americans-worry-work-being-automated)]** Statistics on social impact.
* **[[Kaggle](https://www.kaggle.com/datasets/nitishkumar2k01/llms-energy-consumption-dataset)]** Dataset on energy consumption of LLM.

---

##  Authors (iPanda group)

* *Pietro Panizza* - [s4488189]
* *Francesco Favareto* - [s5038782]
```