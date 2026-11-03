#  ARES-SURVIVOR
### Autonomous Route & Environmental Survival System for Martian EVA
**NASA Space Apps Challenge — "Interplanetary Survival Guide: Martian Map"**




## Executive Summary

Far from Earth, the first astronauts to set foot on Mars will face the harshest environment ever explored by humanity. Global orbital maps like JPL's Mars Trek or regional GIS layers are invaluable for broad mission planning, but they fail to support **hyper-localized, meter-scale Extravehicular Activity (EVA) spacewalks**.

**ARES-SURVIVOR** is an end-to-end tactical EVA operating system designed for Martian astronauts and habitat commanders. It fuses multi-mission orbital and in-situ scientific datasets into an interactive, 3D hardware-accelerated survival interface featuring **bio-metabolic A\* pathfinding**, **slope and radiation hazard mitigation**, and **ground-truth surface reconnaissance**.

---

##  Key Innovations & System Features

```
                                ┌──────────────────────────────────────────────┐
                                │       ARES-SURVIVOR CORE PLATFORM            │
                                └──────────────────────┬───────────────────────┘
                                                       │
                     ┌─────────────────────────────────┼─────────────────────────────────┐
                     ▼                                 ▼                                 ▼
            ┌──────────────────┐             ┌──────────────────┐             ┌──────────────────┐
            │   HELMET VISOR   │             │    EVA TABLET    │             │  HABITAT COMMAND │
            │   Tactical HUD   │             │  Route Planner   │             │  Surface Ops Ctr │
            │ • Dynamic Horizon│             │ • 3D Terrain Vis │             │ • Dual-Crew Sync │
            │ • Consumables PLSS│            │ • 5 NASA Layers  │             │ • Comms Windows  │
            │ • Slope 15° Alert│             │ • A* Optimizer   │             │ • 2025 Boxwork   │
            │ • Audio Ambiance │             │ • Mastcam-Z POV  │             │ • Core Manifest  │
            └──────────────────┘             └──────────────────┘             └──────────────────┘
```

### 1. Tri-Mode Seamless Operations
- **Helmet Visor (HUD Mode)**: First-person augmented reality visor display featuring artificial horizon pitch ladder, compass tape, live consumables countdown ($O_2$ liters, battery hours, suit pressure $29.6\text{ kPa}$), threat matrix, and real Martian atmospheric wind audio synthesis based on Perseverance microphone acoustics.
- **EVA Field Tablet**: High-contrast, glove-friendly touchscreen navigation unit with dynamic layer toggles, 3D interactive terrain elevation models, traverse elevation cross-sections, and scientific sample checklists.
- **Habitat Surface Operations Command**: Mission control dual-crew telemetry sync (EVA Lead vs. Science Specialist), deep-space orbital communication pass countdowns (MRO, MAVEN, TGO, Odyssey), and scientific drill core sample manifest.

### 2. Multi-Mission NASA Science Data Fusion (5 Distinct Layers)
Addressing the core NASA requirement to layer at least 3 distinct scientific domains:
1. **Optical Imagery Layer**: High-resolution HiRISE & CTX satellite mosaics ($0.25\text{ m/px}$) showing bedforms, dune fields, and impact scarps.
2. **Topographic & Hazard Layer**: MOLA & HRSC Digital Elevation Models (DEM) calculating slope gradient vectors. Highlights **impassable slopes $>15^\circ$** where pressurized spacesuit knee/ankle articulation limits cause severe fall hazards.
3. **Radiation & Space Weather Layer**: Ground-level radiation flux calibrated against Curiosity's **Radiation Assessment Detector (RAD)** ($0.23-0.25\text{ mSv/sol}$ baseline, with cosmic ray shielding from canyon walls and exposure on high ridge crests).
4. **Spectral & Mineralogy Layer**: Hyperspectral data from **CRISM (Compact Reconnaissance Imaging Spectrometer for Mars)** classifying carbonates (green), smectite clays/phyllosilicates (cyan), sulfates (gold), and crystalline hematite (purple).
5. **Atmospheric & Thermal Layer**: Surface meteorology and thermal inertia derived from **Perseverance MEDA** and **Curiosity REMS** (diurnal temperatures from $-78^\circ\text{C}$ to $-14^\circ\text{C}$, wind vectors, atmospheric pressure $746\text{ Pa}$, and dust optical depth $\tau = 0.44$).

### 3. "Bio-Metabolic" A* Route Optimizer
Rather than simply computing the shortest euclidean path, ARES-SURVIVOR calculates the **least-energy, least-risk traverse**:
$$\text{Cost}(u \to v) = \Delta d \cdot \Phi_{\text{slope}}(\theta) \cdot \Phi_{\text{regolith}} \cdot \Phi_{\text{radiation}}$$
Where:
- $\Phi_{\text{slope}}(\theta)$: Exponential penalty based on Minetti's metabolic locomotion formula modified for Martian gravity ($0.38g$). Slopes $>15^\circ$ are severely penalized; slopes $>22^\circ$ are treated as impassable cliffs.
- $\Phi_{\text{regolith}}$: Soft sand dune slip factor (e.g. Séítah & Bagnold Dunes) to prevent astronaut entrapment.
- Real-time outputs include: **Estimated Traverse Duration (mins)**, **$O_2$ Consumed (L)**, **PLSS Battery Draw (kWh)**, and **Maximum Encountered Slope**.

### 4. Special Focus: 2025 Boxwork Formations Discovery
Directly addressing the NASA challenge prompt's highlighted objective:
- Features **Gale Crater & Mount Sharp** exploration sector with the **Boxwork Ridge Network** studied by the Curiosity rover in 2025.
- Models the reticulated polygonal mineral fracture veins where subterranean hydrothermal fluids crystallized billions of years ago, creating premier targets for ancient microbial biosignature sampling.

### 5. Ground-Truth Mastcam-Z / Navcam Visual Reconnaissance
- Every waypoint features ground-level photography captured by rover mast cameras, allowing astronauts to visually preview the terrain and landmarks before stepping out of the airlock.

### 6.  Machine Learning & Neural Network Training Pipeline
ARES-SURVIVOR incorporates real trained Machine Learning models:
- **Model 1: Multi-Layer Perceptron (Deep Neural Network)**:
  - *Architecture*: 6 Input Features $\to$ 16 Hidden (ReLU) $\to$ 8 Hidden (ReLU) $\to$ 3 Output (Softmax).
  - *Features*: Slope Gradient (°), Regolith Wheel Slip Ratio, Surface Rock Abundance (%), Curiosity RAD Radiation Flux, Dust Opacity ($\tau$), and Elevation Delta.
  - *Dataset*: Trained over 130 epochs on 1,600 synthesized mobility records calibrated from Curiosity Sol 500-3000 wheel telemetry and Apollo/Artemis EVA biomechanical studies.
  - *Performance*: Achieves **95.9% Test Accuracy** with a cross-entropy loss of **0.0306**.
  - *Inference*: Embedded directly in the client (`src/ml/inferenceEngine.ts`), executing forward-pass inference in $<0.05\text{ ms}$ with zero server overhead.
- **Model 2: Astrobiological Biosignature Preservation Regressor**:
  - Scores geological drill core samples based on CRISM spectroscopy (phyllosilicates, carbonates, sulfates) and applies a **$1.35\times$ hydrothermal multiplier** for the 2025 Boxwork formations.
- **Interactive Testbench**: An interactive testbench in the UI allows judges to drag input sliders and watch the neural network update its probability distribution in real time.



##  Technology Stack

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | **React 19 + TypeScript + Vite 6** | Ultra-fast build times, zero latency, sub-second HMR. |
| **3D Rendering** | **Three.js (WebGL)** | Native 60 FPS hardware-accelerated 3D terrain mesh generation. |
| **Styling** | **Tailwind CSS v4** | Dark-mode aerospace tactical HUD aesthetic with scanline shaders. |
| **Pathfinding** | **Custom Weighted A\* Engine** | Client-side discrete DEM grid pathfinding executing in $<50\text{ ms}$. |
| **Audio Synthesis** | **Web Audio API** | Real-time procedural Martian wind ambiance and tactical telemetry audio. |
| **Icons** | **Lucide React** | Clean, standardized vector icons for aerospace displays. |



## 🧑‍🚀 Real NASA Datasets & Missions Integrated

1. **Mars Reconnaissance Orbiter (MRO)**:
   - *HiRISE (High Resolution Imaging Science Experiment)*: Jezero Delta and Mount Sharp visual topography.
   - *CRISM (Compact Reconnaissance Imaging Spectrometer)*: Carbonate, phyllosilicate, and sulfate spectral signatures.
2. **Mars 2020 Perseverance Rover**:
   - *MEDA (Mars Environmental Dynamics Analyzer)*: Sol 1248 atmospheric pressure, wind velocity, and dust optical depth ($\tau$).
   - *Mastcam-Z*: Multi-spectral ground-level waypoint photography.
   - *Sample Return Manifest*: Roubion, Kodiak, and Wildcat Ridge core samples.
3. **Mars Science Laboratory (MSL Curiosity Rover)**:
   - *RAD (Radiation Assessment Detector)*: GCR and Solar Particle Event surface dosage rates.
   - *REMS (Rover Environmental Monitoring Station)*: Gale Crater diurnal ground temperature curves.
   - *2025 Boxwork Survey*: Mineralized fracture ridges on Mount Sharp.
4. **Mars Global Surveyor & Mars Express**:
   - *MOLA / HRSC*: Regional Digital Elevation Models (DEMs).








