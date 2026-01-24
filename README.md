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

text  
├── index.html                           # Landing page principale  
├── LICENSE                              # Licenza del progetto  
├── README.md                            # Documentazione del progetto  
├── assets/  
│   ├── css/
│   │   ├── style.css                    # Stili globali  
│   │   └── pages.css                    # Stili comuni alle sottopagine  
│   └── js/
│       ├── models.js                    # Grafici D3 per i modelli  
│       ├── polarChart.js                # PolarChart benchmarks by models   
│       ├── barChart.js                  # BarChart models by benchmarks  
│       ├── streamgraph.js               # Visualizzazione impatto ambientale  
│       └── Linechart.js                 # Linechart impatto sociale  
│   
├── images/                              # Sfondi, icone e immagini di supporto  
├── data/                                # Dataset (CSV/JSON)  
│   ├── ai_models/                        # Dati sui training modelli  
│   ├── benchmark_data/                   # Dati dei benchmark  
│   ├── data_centers/                     # Dati sui data center  
│   ├── americans-worry-work-being-automated.csv  # Dati su preoccupazioni automazione  
│   ├── llm-energy-use.csv               # Dati su consumo energetico LLM  
│   └── desktop.ini                      # File di sistema Windows  
└── pages/                               # Pagine HTML aggiuntive  
    ├── benchmark-details.css            # CSS per le pagine benchmark  
    ├── benchmark-details.html           # Dettagli benchmark  
    ├── details-bench.html               # Approfondimento descrittivo benchmark  
    ├── investments-details.html         # Mappa interattiva Data Centers  
    ├── social-environmental-impacts.css # Analisi tecnica modelli AI  
    ├── socio-environment-details.html   # Mappa interattiva Data Centers  
    └── models-details.html              # Analisi tecnica modelli AI  


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

* **[[EPOCH AI](https://epoch.ai/)]** Dati su parametri, compute e benchmark.
* **[[Our World in Data](https://ourworldindata.org/grapher/americans-worry-work-being-automated)]** Statistiche sull'automazione e opinione pubblica.
* **[[Kaggle](https://www.kaggle.com/datasets/nitishkumar2k01/llms-energy-consumption-dataset)]** Dataset energetico degli LLM.

---

##  Authors (Gruppo iPanda)

* *Pietro Panizza* - [s4488189]
* *Francesco Favareto* - [s5038782]
```