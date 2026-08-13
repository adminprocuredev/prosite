import React, { Component } from 'react'
import { GoogleMap, LoadScript, Polygon, InfoWindow, Marker, Circle, Polyline } from '@react-google-maps/api'
import IconButton from '@mui/material/IconButton'
import GpsFixed from '@mui/icons-material/GpsFixed'
import Box from '@mui/material/Box'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ReactDOM from 'react-dom/client'

const apiKey = process.env.NEXT_PUBLIC_PROD_APIKEY // process.env.REACT_APP_GOOGLE_MAP_KEY //

// Encuadre que muestra las faenas completas. Es el estado inicial y el que
// devuelve el boton "Mapa ampliado".
const VISTA_GENERAL = { centro: { lat: -24.261986, lng: -69.060333 }, zoom: 13 }

const UserLocationIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" fill="none" class="css-i6dzq1">
  <circle cx="12" cy="12" r="10" stroke="blue" fill="blue" fill-opacity="0.3"></circle>
  <circle cx="12" cy="12" r="3" stroke="white" fill="blue"></circle>
</svg>
`

const plantas = [
  {
    nombre: 'Los Colorados',
    color: '#FF0000',
    centro: { lat: -24.2625, lng: -69.059 },
    zoom: 17,
    areas: [
      {
        paths: [
          { lat: -24.261986, lng: -69.060333 },
          { lat: -24.26402, lng: -69.05958 },
          { lat: -24.26361, lng: -69.058039 },
          { lat: -24.261324, lng: -69.05869 }
        ],
        type: 'polygon',
        name: '2300 - Molienda',
        visible: true
      },
      {
        paths: [
          { lat: -24.264679, lng: -69.058169 },
          { lat: -24.264777, lng: -69.056966 },
          { lat: -24.262995, lng: -69.056107 },
          { lat: -24.261324, lng: -69.056057 },
          { lat: -24.260808, lng: -69.054589 },
          { lat: -24.260155, lng: -69.054081 },
          { lat: -24.259365, lng: -69.054782 },
          { lat: -24.260253, lng: -69.056959 },
          { lat: -24.261382, lng: -69.057618 },
          { lat: -24.263243, lng: -69.057704 },
          { lat: -24.263948, lng: -69.058219 }
        ],
        type: 'polygon',
        name: '2500 - Espesadores',
        visible: true
      }
    ]
  },
  {
    nombre: 'Laguna Seca 1',
    color: '#00FF00',
    centro: { lat: -24.3429, lng: -69.064 },
    zoom: 16,
    areas: [
      {
        paths: [
          { lat: -24.346466, lng: -69.057915 },
          { lat: -24.346194, lng: -69.058371 },
          { lat: -24.345814, lng: -69.058858 },
          { lat: -24.345310, lng: -69.059665 },
          { lat: -24.345269, lng: -69.059636 },
          { lat: -24.345770, lng: -69.058829 },
          { lat: -24.346132, lng: -69.058358 },
          { lat: -24.346416, lng: -69.057889 }
        ],
        type: 'polygon',
        name: '1220 - OVERLAND CONVEYOR 1220-CV-239',
        visible: true
      },
      {
        paths: [
          { lat: -24.346167, lng: -69.059474 },
          { lat: -24.345399, lng: -69.058989 },
          { lat: -24.344667, lng: -69.060151 },
          { lat: -24.345444, lng: -69.060651 }
        ],
        type: 'polygon',
        name: '1230 - COARSE ORE STOCKPILE BUILDING',
        visible: true
      },
      {
        paths: [
          { lat: -24.344790, lng: -69.061087 },
          { lat: -24.344629, lng: -69.061323 },
          { lat: -24.344366, lng: -69.061784 },
          { lat: -24.344384, lng: -69.061795 },
          { lat: -24.344657, lng: -69.061338 },
          { lat: -24.344811, lng: -69.061106 }
        ],
        type: 'polygon',
        name: '1240 - SG MILL FEED CONVEYOR TAG. 1240-CV-23',
        visible: true
      },
      {
        paths: [
          { lat: -24.344413, lng: -69.063037 },
          { lat: -24.344715, lng: -69.062543 },
          { lat: -24.344413, lng: -69.062310 },
          { lat: -24.344648, lng: -69.061915 },
          { lat: -24.344058, lng: -69.061541 },
          { lat: -24.343829, lng: -69.061819 },
          { lat: -24.343721, lng: -69.061762 },
          { lat: -24.343666, lng: -69.061829 },
          { lat: -24.343530, lng: -69.061742 },
          { lat: -24.343265, lng: -69.062291 }
        ],
        type: 'polygon',
        name: '1310 - GRINDING BUILDING',
        visible: true
      },
      {
        paths: [
          { lat: -24.345121, lng: -69.060709 },
          { lat: -24.345031, lng: -69.060652 },
          { lat: -24.344975, lng: -69.060736 },
          { lat: -24.345070, lng: -69.060794 }
        ],
        type: 'polygon',
        name: '1310 - SAG MILL GRINDING BALL STORAGE',
        visible: true
      },
      {
        paths: [
          { lat: -24.345482, lng: -69.061111 },
          { lat: -24.345402, lng: -69.061064 },
          { lat: -24.345352, lng: -69.061147 },
          { lat: -24.345435, lng: -69.061200 }
        ],
        type: 'polygon',
        name: '1310 - BALL MILL GRINDING BALL STORAGE',
        visible: true
      },
      {
        paths: [
          { lat: -24.343410, lng: -69.062410 },
          { lat: -24.343341, lng: -69.062480 },
          { lat: -24.343175, lng: -69.062392 },
          { lat: -24.342535, lng: -69.063451 },
          { lat: -24.344089, lng: -69.064427 },
          { lat: -24.344271, lng: -69.064116 },
          { lat: -24.344170, lng: -69.064054 },
          { lat: -24.344564, lng: -69.063301 },
          { lat: -24.344444, lng: -69.063226 },
          { lat: -24.344515, lng: -69.063102 }
        ],
        type: 'polygon',
        name: '1320 - FLOTATION AREA',
        visible: true
      },
      {
        paths: [
          { lat: -24.343574, lng: -69.063684 },
          { lat: -24.343413, lng: -69.063995 },
          { lat: -24.343855, lng: -69.064277 },
          { lat: -24.344009, lng: -69.063971 },
        ],
        type: 'polygon',
        name: '1320 - REGRINDING PLANT',
        visible: true
      },
      {
        paths: [
          { lat: -24.343417, lng: -69.065135 },
          { lat: -24.343413, lng: -69.065315 },
          { lat: -24.343541, lng: -69.065314 },
          { lat: -24.343545, lng: -69.065385 },
          { lat: -24.343672, lng: -69.065391 },
          { lat: -24.343671, lng: -69.065316 },
          { lat: -24.343791, lng: -69.065320 },
          { lat: -24.343804, lng: -69.065133 }
        ],
        type: 'polygon',
        name: '1350 - FLOTATION EMERGENCY TANK',
        visible: true
      },
      {
        paths: [
          { lat: -24.345670, lng: -69.063275 },
          { lat: -24.345954, lng: -69.063482 },
          { lat: -24.346001, lng: -69.063405 },
          { lat: -24.346088, lng: -69.063461 },
          { lat: -24.346170, lng: -69.063322 },
          { lat: -24.346086, lng: -69.063262 },
          { lat: -24.346130, lng: -69.063189 },
          { lat: -24.345830, lng: -69.062994 }
        ],
        type: 'polygon',
        name: '1330 - PEBBLE CRUSHING PLANT',
        visible: true
      },
      {
        center: { lat: -24.338802, lng: -69.061664 },
        radius: 22.5,
        type: 'circle',
        name: '1340 - CONCENTRATE THICKENER',
        visible: true
      },
      {
        center: { lat: -24.339229, lng: -69.061934 },
        radius: 22.5,
        type: 'circle',
        name: '1340 - CONCENTRATE THICKENER',
        visible: true
      },
      {
        center: { lat: -24.338663, lng: -69.062482 },
        radius: 22.5,
        type: 'circle',
        name: '1340 - CLARIFIER',
        visible: true
      },
      {
        center: { lat: -24.343518, lng: -69.066165 },
        radius: 65,
        type: 'circle',
        name: '1350 - TAILINGS THICKENER',
        visible: true
      },
      {
        center: { lat: -24.344651, lng: -69.066881 },
        radius: 65,
        type: 'circle',
        name: '1350 - TAILINGS THICKENER',
        visible: true
      },
      {
        center: { lat: -24.345356, lng: -69.065697 },
        radius: 65,
        type: 'circle',
        name: '1350 - TAILINGS THICKENER',
        visible: true
      },
      {
        paths: [
          { lat: -24.345005, lng: -69.068613 },
          { lat: -24.345060, lng: -69.068898 },
          { lat: -24.345266, lng: -69.068860 },
          { lat: -24.345207, lng: -69.068573 }
        ],
        type: 'polygon',
        name: '1350 - FINAL TAILING COLLECTION BOX',
        visible: true
      },
      {
        paths: [
          { lat: -24.344132, lng: -69.063784 },
          { lat: -24.344071, lng: -69.063895 },
          { lat: -24.344156, lng: -69.063949 },
          { lat: -24.344220, lng: -69.063839 }
        ],
        type: 'polygon',
        name: '1320 -TAILINGS SAMPLER',
        visible: true
      },
      {
        paths: [
          { lat: -24.344536, lng: -69.065163 },
          { lat: -24.344371, lng: -69.065185 },
          { lat: -24.344461, lng: -69.065753 },
          { lat: -24.344618, lng: -69.065733 }
        ],
        type: 'polygon',
        name: '1360 - FLOCULANT PREPARATION',
        visible: true
      },
      {
        paths: [
          { lat: -24.344796, lng: -69.060507 },
          { lat: -24.344663, lng: -69.060413 },
          { lat: -24.344602, lng: -69.060510 },
          { lat: -24.344742, lng: -69.060605 }
        ],
        type: 'polygon',
        name: '1360 - NASH TANK',
        visible: true
      },
      {
        paths: [
          { lat: -24.344407, lng: -69.061383 },
          { lat: -24.344670, lng: -69.060924 },
          { lat: -24.344315, lng: -69.060695 },
          { lat: -24.344048, lng: -69.061158 }
        ],
        type: 'polygon',
        name: '1370 - LIME PLANT',
        visible: true
      },
      {
        paths: [
          { lat: -24.342674, lng: -69.063540 },
          { lat: -24.342606, lng: -69.063661 },
          { lat: -24.342742, lng: -69.063748 },
          { lat: -24.342820, lng: -69.063630 }
        ],
        type: 'polygon',
        name: '1370 - LIME STORAGE FLOTATION AREA',
        visible: true
      },
      {
        paths: [
          { lat: -24.344960, lng: -69.063503 },
          { lat: -24.344577, lng: -69.064091 },
          { lat: -24.344760, lng: -69.064223 },
          { lat: -24.345145, lng: -69.063631 }
        ],
        type: 'polygon',
        name: '1390 - AIR COMPRESSORS',
        visible: true
      },
      {
        paths: [
          { lat: -24.342872, lng: -69.062723 },
          { lat: -24.342578, lng: -69.063171 },
          { lat: -24.342682, lng: -69.063232 },
          { lat: -24.342964, lng: -69.062783 }
        ],
        type: 'polygon',
        name: '1320 - BLOWERS',
        visible: true
      },
      {
        paths: [
          { lat: -24.344303, lng: -69.065796 },
          { lat: -24.344365, lng: -69.066070 },
          { lat: -24.344591, lng: -69.066003 },
          { lat: -24.344534, lng: -69.065747 }
        ],
        type: 'polygon',
        name: '1350 - TAILINGS THICKENER DISTRIBUTOR',
        visible: true
      },
      {
        paths: [
          { lat: -24.342588, lng: -69.063448 },
          { lat: -24.341793, lng: -69.062942 },
          { lat: -24.341648, lng: -69.062974 },
          { lat: -24.339183, lng: -69.061423 },
          { lat: -24.339086, lng: -69.061592 },
          { lat: -24.339108, lng: -69.061606 },
          { lat: -24.338840, lng: -69.062113 },
          { lat: -24.338586, lng: -69.061957 },
          { lat: -24.338207, lng: -69.062568 },
          { lat: -24.338242, lng: -69.062589 },
          { lat: -24.338219, lng: -69.062659 },
          { lat: -24.338536, lng: -69.062870 },
          { lat: -24.338419, lng: -69.063078 },
          { lat: -24.338474, lng: -69.063325 },
          { lat: -24.339088, lng: -69.063712 },
          { lat: -24.339012, lng: -69.063847 },
          { lat: -24.339038, lng: -69.063903 }
        ],
        type: 'line',
        name: '1340 - CONCENTRATE PIPERACK',
        visible: true
      },
      {
        paths: [
          { lat: -24.338840, lng: -69.062113 },
          { lat: -24.339877, lng: -69.062763 },
          { lat: -24.339807, lng: -69.062885 },
          { lat: -24.340041, lng: -69.063024 }
        ],
        type: 'line',
        name: '1340 - CONCENTRATE PIPERACK',
        visible: true
      },
      {
        paths: [
          { lat: -24.339910, lng: -69.062941 },
          { lat: -24.339728, lng: -69.063297 },
          { lat: -24.340077, lng: -69.063527 },
          { lat: -24.340263, lng: -69.063165 }
        ],
        type: 'polygon',
        name: '1410 - CONCENTRATE STORAGE TANKS',
        visible: true
      },
      {
        paths: [
          { lat: -24.339496, lng: -69.063312 },
          { lat: -24.339273, lng: -69.063693 },
          { lat: -24.339558, lng: -69.063876 },
          { lat: -24.339776, lng: -69.063508 }
        ],
        type: 'polygon',
        name: '1420 - CONCENTRATE PUMP HOUSE',
        visible: true
      },
      {
        paths: [
          { lat: -24.338061, lng: -69.062857 },
          { lat: -24.337638, lng: -69.063643 },
          { lat: -24.337907, lng: -69.063820 },
          { lat: -24.338328, lng: -69.063024 }
        ],
        type: 'polygon',
        name: '1340 - EMERGENCY CONCENTRATE POND',
        visible: true
      },
      {
        paths: [
          { lat: -24.346464, lng: -69.063275 },
          { lat: -24.345930, lng: -69.064126 },
          { lat: -24.346343, lng: -69.064387 },
          { lat: -24.346842, lng: -69.063512 }
        ],
        type: 'polygon',
        name: '1680 - HARMONIC FILTERS',
        visible: true
      },
      {
        paths: [
          { lat: -24.344001, lng: -69.055283 },
          { lat: -24.343601, lng: -69.055948 },
          { lat: -24.344874, lng: -69.056768 },
          { lat: -24.345250, lng: -69.056071 }
        ],
        type: 'polygon',
        name: '1720 - PROCESS WATER PONDS',
        visible: true
      },
      {
        paths: [
          { lat: -24.342595, lng: -69.054537 },
          { lat: -24.342223, lng: -69.055200 },
          { lat: -24.343470, lng: -69.055928 },
          { lat: -24.343868, lng: -69.055271 }
        ],
        type: 'polygon',
        name: '1720 - PROCESS WATER PONDS',
        visible: true
      },
      {
        paths: [
          { lat: -24.342675, lng: -69.054000 },
          { lat: -24.342160, lng: -69.053690 },
          { lat: -24.341821, lng: -69.054261 },
          { lat: -24.342335, lng: -69.054567 }
        ],
        type: 'polygon',
        name: '1720 - R.O. PLANT',
        visible: true
      },
      {
        paths: [
          { lat: -24.342086, lng: -69.053848 },
          { lat: -24.341836, lng: -69.054225 },
          { lat: -24.341999, lng: -69.054336 },
          { lat: -24.342240, lng: -69.053942 }
        ],
        type: 'polygon',
        name: '1720 - COOLING TOWER',
        visible: true
      },
      {
        paths: [
          { lat: -24.345698, lng: -69.067681 },
          { lat: -24.345552, lng: -69.068124 },
          { lat: -24.346055, lng: -69.068296 },
          { lat: -24.346168, lng: -69.067847 },
          { lat: -24.346009, lng: -69.067783 },
          { lat: -24.346043, lng: -69.067639 },
          { lat: -24.345889, lng: -69.067585 },
          { lat: -24.345852, lng: -69.067735 }
        ],
        type: 'polygon',
        name: '1350 - RECOVERY WATER PUMP STATION',
        visible: true
      },
      {
        paths: [
          { lat: -24.346188, lng: -69.066464 },
          { lat: -24.346117, lng: -69.066711 },
          { lat: -24.346394, lng: -69.066800 },
          { lat: -24.346465, lng: -69.066538 }
        ],
        type: 'polygon',
        name: '1730 - SEAWAGE TREATMENT PLANT',
        visible: true
      },
      {
        paths: [
          { lat: -24.346343, lng: -69.064387 },
          { lat: -24.346842, lng: -69.063512 },
          { lat: -24.347684, lng: -69.064043 },
          { lat: -24.347190, lng: -69.064885 }
        ],
        type: 'polygon',
        name: '1741 - ELECTRICAL SUB-STATION',
        visible: true
      },
      {
        paths: [
          { lat: -24.339085, lng: -69.060982 },
          { lat: -24.339218, lng: -69.060759 },
          { lat: -24.339467, lng: -69.060924 },
          { lat: -24.339586, lng: -69.060726 },
          { lat: -24.339183, lng: -69.060491 },
          { lat: -24.338914, lng: -69.060959 },
          { lat: -24.339326, lng: -69.061215 },
          { lat: -24.339359, lng: -69.061161 }
        ],
        type: 'polygon',
        name: '2400 - WAREHOUSE (EXPANSION)',
        visible: true
      },
      {
        paths: [
          { lat: -24.345186, lng: -69.063176 },
          { lat: -24.345101, lng: -69.063329 },
          { lat: -24.345349, lng: -69.063466 },
          { lat: -24.345428, lng: -69.063311 }
        ],
        type: 'polygon',
        name: '5500 - CHANGE HOUSE',
        visible: true
      },
      {
        paths: [
          { lat: -24.342776, lng: -69.053519 },
          { lat: -24.342505, lng: -69.053339 },
          { lat: -24.342375, lng: -69.053558 },
          { lat: -24.342638, lng: -69.053739 }
        ],
        type: 'polygon',
        name: '1720 - FRESH WATER TANK',
        visible: true
      },
      {
        paths: [
          { lat: -24.345518, lng: -69.060877 },
          { lat: -24.345913, lng: -69.061124 },
          { lat: -24.346009, lng: -69.060947 },
          { lat: -24.345612, lng: -69.060711 }
        ],
        type: 'polygon',
        name: '1240 - COARSE ORE ELECTRICAL ROOM 1240-ER-525',
        visible: true
      },
      {
        paths: [
          { lat: -24.343726, lng: -69.061764 },
          { lat: -24.343668, lng: -69.061857 },
          { lat: -24.343780, lng: -69.061928 },
          { lat: -24.343836, lng: -69.061829 }
        ],
        type: 'polygon',
        name: '1310 - GRINDING SAG ELECTRICAL ROOM 1310-ER-522',
        visible: true
      },
      {
        paths: [
          { lat: -24.344413, lng: -69.063037 },
          { lat: -24.343860, lng: -69.062684 },
          { lat: -24.343927, lng: -69.062546 },
          { lat: -24.344482, lng: -69.062924 }
        ],
        type: 'polygon',
        name: '1310 - SANG AND BALL MILLS ELECTRICAL ROOM 1310-ER-520',
        visible: true
      },
      {
        paths: [
          { lat: -24.344457, lng: -69.063828 },
          { lat: -24.344720, lng: -69.063395 },
          { lat: -24.344576, lng: -69.063305 },
          { lat: -24.344309, lng: -69.063736 }
        ],
        type: 'polygon',
        name: '1320 - FLOTATION ELECTRICAL ROOM 1320-ER-523',
        visible: true
      },
      {
        paths: [
          { lat: -24.345427, lng: -69.062729 },
          { lat: -24.345765, lng: -69.062938 },
          { lat: -24.345865, lng: -69.062793 },
          { lat: -24.345523, lng: -69.062573 }
        ],
        type: 'polygon',
        name: '1330 - PEBBLES ELECTRICAL ROOM 1330-ER-524',
        visible: true
      },
      {
        paths: [
          { lat: -24.338877, lng: -69.063142 },
          { lat: -24.338960, lng: -69.062997 },
          { lat: -24.338807, lng: -69.062898 },
          { lat: -24.338768, lng: -69.062968 },
          { lat: -24.338594, lng: -69.062862 },
          { lat: -24.338548, lng: -69.062937 }
        ],
        type: 'polygon',
        name: '1340 - CONCENTRATE THICKENING ROOM 1340-ER-526',
        visible: true
      },
      {
        paths: [
          { lat: -24.344276, lng: -69.065194 },
          { lat: -24.344162, lng: -69.065207 },
          { lat: -24.344160, lng: -69.065259 },
          { lat: -24.344070, lng: -69.065286 },
          { lat: -24.344117, lng: -69.065648 },
          { lat: -24.344212, lng: -69.065636 },
          { lat: -24.344236, lng: -69.065738 },
          { lat: -24.344333, lng: -69.065729 }
        ],
        type: 'polygon',
        name: '1350 - TAILING THICKENER ELECTRICAL ROOM 1350-ER-527',
        visible: true
      },
      {
        paths: [
          { lat: -24.339482, lng: -69.064056 },
          { lat: -24.339643, lng: -69.064160 },
          { lat: -24.339904, lng: -69.063730 },
          { lat: -24.339732, lng: -69.063627 }
        ],
        type: 'polygon',
        name: '1420 - CONC. PUMP STATION ELECTRICAL ROOM 1420-ER-532',
        visible: true
      },
      {
        paths: [
          { lat: -24.342084, lng: -69.053736 },
          { lat: -24.341864, lng: -69.053596 },
          { lat: -24.341643, lng: -69.053965 },
          { lat: -24.341856, lng: -69.054108 }
        ],
        type: 'polygon',
        name: '1720 - WATER DISTRIB. SYST. ELECTRICAL ROOM 1720-ER-530',
        visible: true
      },
      {
        paths: [
          { lat: -24.346964, lng: -69.064590 },
          { lat: -24.347018, lng: -69.064510 },
          { lat: -24.346482, lng: -69.064166 },
          { lat: -24.346424, lng: -69.064257 }
        ],
        type: 'polygon',
        name: '1741 - MAIN ELECTRICAL SUBSTATION 1741-ER-001',
        visible: true
      },
      {
        paths: [
          { lat: -24.345120, lng: -69.063969 },
          { lat: -24.344903, lng: -69.064320 },
          { lat: -24.345133, lng: -69.064456 },
          { lat: -24.345339, lng: -69.064101 }
        ],
        type: 'polygon',
        name: '5500 - METALLURGICAL AND CHEMICAL LABORATORY',
        visible: true
      },
      {
        paths: [
          { lat: -24.345205, lng: -69.062382 },
          { lat: -24.345127, lng: -69.062521 },
          { lat: -24.345412, lng: -69.062701 },
          { lat: -24.345496, lng: -69.062564 }
        ],
        type: 'polygon',
        name: '5500 - HAMMER LINER HANDLER BUILDING',
        visible: true
      },
      {
        paths: [
          { lat: -24.345216, lng: -69.062369 },
          { lat: -24.345511, lng: -69.062557 },
          { lat: -24.345599, lng: -69.062422 },
          { lat: -24.345297, lng: -69.062229 }
        ],
        type: 'polygon',
        name: '5500 - WORKSHOP BUILDING',
        visible: true
      },
      {
        paths: [
          { lat: -24.342989, lng: -69.063312 },
          { lat: -24.342843, lng: -69.063566 },
          { lat: -24.343163, lng: -69.063772 },
          { lat: -24.343313, lng: -69.063527 }
        ],
        type: 'polygon',
        name: '1320 - COLUMN FLOTATION CELL',
        visible: true
      },
      {
        center: { lat: -24.342287, lng: -69.063985 },
        radius: 2.5,
        type: 'circle',
        name: '1360 - FLOCULANT EXPANSION',
        visible: true
      },
      {
        paths: [
          { lat: -24.342527, lng: -69.063669 },
          { lat: -24.342618, lng: -69.063514 },
          { lat: -24.342462, lng: -69.063416 },
          { lat: -24.342379, lng: -69.063570 }
        ],
        type: 'polygon',
        name: '1720 - WARM WATER TANK',
        visible: true
      },
      {
        paths: [
          { lat: -24.346428, lng: -69.057925 },
          { lat: -24.340922, lng: -69.054710 }
        ],
        type: 'line',
        name: '1220 - OVERLAND CONVEYOR 1220-CV-238',
        visible: true
      },
      {
        paths: [
          { lat: -24.341470, lng: -69.061415 },
          { lat: -24.341236, lng: -69.061801 },
          { lat: -24.341435, lng: -69.061929 },
          { lat: -24.341648, lng: -69.061524 }
        ],
        type: 'polygon',
        name: '0310 - NEW CONTROL ROOM',
        visible: true
      }
    ]
  },
  {
    nombre: 'Laguna Seca 2',
    color: '#0000FF',
    centro: { lat: -24.345134, lng: -69.063545 },
    zoom: 16,
    areas: [
      {
        paths: [
          { lat: -24.342391, lng: -69.066748 },
          { lat: -24.342391, lng: -69.066730 },
          { lat: -24.342380, lng: -69.066730 },
          { lat: -24.342380, lng: -69.066748 }
        ],
        type: 'polygon',
        name: '4000 - Laguna Seca 2',
        visible: true
      }
    ]
  },
  {
    nombre: 'Chancado y Correas',
    color: '#F0F000',
    centro: { lat: -24.272899, lng: -69.050887 },
    zoom: 15,
    areas: [
      {
        paths: [
          { lat: -24.275178, lng: -69.055543 },
          { lat: -24.27418, lng: -69.046187 },
          { lat: -24.268948, lng: -69.046649 },
          { lat: -24.269124, lng: -69.056712 }
        ],
        type: 'polygon',
        name: '4000 - Chancado',
        visible: true
      }
    ]
  },
  {
    nombre: 'Puerto Coloso',
    color: '#F0F0F0',
    centro: { lat: -23.7627, lng: -70.468 },
    zoom: 16,
    areas: [
      {
        paths: [
          { lat: -23.768948, lng: -70.472057 },
          { lat: -23.766141, lng: -70.471642 },
          { lat: -23.758825, lng: -70.464623 },
          { lat: -23.756331, lng: -70.463956 },
          { lat: -23.75595, lng: -70.46763 },
          { lat: -23.764409, lng: -70.476489 }
        ],
        type: 'polygon',
        name: '6000 - Puerto Coloso',
        visible: true
      }
    ]
  },
  {
    nombre: 'Catodos',
    color: '#61DFF2',
    centro: { lat: -24.234813, lng: -69.128289 },
    zoom: 15,
    areas: [
      {
        paths: [
          { lat: -24.236574, lng: -69.131625 },
          { lat: -24.236496, lng: -69.128686 },
          { lat: -24.233414, lng: -69.126164 },
          { lat: -24.232328, lng: -69.129061 }
        ],
        type: 'polygon',
        name: '3259 - Catodos',
        visible: true
      }
    ]
  }
]

class LocationButton extends Component {
  render() {
    return (
      <div className='location-button'>
        <IconButton
          style={{
            backgroundColor: 'white',
            color: 'black',
            zIndex: 1000,
            width: '40px',
            left: '10px',
            bottom: '10px'
          }}
          onClick={this.props.onClick}
        >
          <GpsFixed />
        </IconButton>
      </div>
    )
  }
}

class Map extends Component {
  constructor(props) {
    super(props)
    this.state = {
      position: VISTA_GENERAL.centro,
      zoom: VISTA_GENERAL.zoom,
      showInfoWindow: false,
      infoWindowPosition: null,

      // null = todas las plantas a la vista. Antes era un array de seis
      // booleanos con casillas para marcar y desmarcar: para ver una planta
      // habia que apagar las otras cinco, que es justo al reves de lo que
      // uno quiere hacer. Elegir una planta es una eleccion, no seis.
      plantaSeleccionada: null,
      userLocation: null
    }
    this.handlePolygonClick = this.handlePolygonClick.bind(this)
    this.irALaPlanta = this.irALaPlanta.bind(this)
    this.elegirPlanta = this.elegirPlanta.bind(this)
  }

  handleMapClick() {
    if (this.state.showInfoWindow) {
      this.setState({ showInfoWindow: false })
    }
  }

  handlePolygonClick(e, index) {
    const content = index
    this.setState({
      showInfoWindow: true,
      infoWindowPosition: { lat: e.latLng.lat(), lng: e.latLng.lng() },
      infoWindowContent: content
    })
  }

  /** Centra el mapa en una planta y le hace zoom. */
  irALaPlanta(index) {
    this.setState({
      position: plantas[index].centro,
      zoom: plantas[index].zoom
    })
  }

  /**
   * Elige qué se ve: una planta, o todas con el mapa ampliado.
   *
   * `index` null es "mapa ampliado" y vuelve a la vista general. Un segundo
   * clic sobre la planta que ya está elegida también devuelve null, que es lo
   * que hace el ToggleButtonGroup al deseleccionar, y cae en el mismo lugar.
   */
  elegirPlanta(index) {
    if (index === null || index === undefined) {
      this.setState({ plantaSeleccionada: null, position: VISTA_GENERAL.centro, zoom: VISTA_GENERAL.zoom })

      return
    }

    this.setState({ plantaSeleccionada: index }, () => this.irALaPlanta(index))
  }

  /** Con el mapa ampliado se dibujan todas; si hay una elegida, solo esa. */
  plantaVisible(index) {
    return this.state.plantaSeleccionada === null || this.state.plantaSeleccionada === index
  }

  //
  componentDidMount() {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        position => {
          this.setState({
            userLocation: { lat: position.coords.latitude, lng: position.coords.longitude }
          })
        },
        error => {
          console.error(error)
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
      )
    } else {
      console.error('Geolocation is not supported by this browser.')
    }
  }

  addLocationButton(map) {
    const locationButtonDiv = document.createElement('div');

    // Crear una raíz para el componente usando createRoot
    const root = ReactDOM.createRoot(locationButtonDiv);

    // Renderizar el componente en la raíz creada
    root.render(
      <LocationButton
        onClick={() => {
          if (this.state.userLocation) {
            this.setState({ position: this.state.userLocation });
          }
        }}
      />
    );

    map.controls[window.google.maps.ControlPosition.LEFT_BOTTOM].push(locationButtonDiv);
  }

  render() {
    return (
      <LoadScript googleMapsApiKey={apiKey}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Una planta es un boton y se elige, sin casillas que marcar. El
              color de cada boton activo es el mismo con que esa planta se
              dibuja en el mapa, para no tener que adivinar cual es cual. */}
          <Box sx={{ px: 2, py: 2 }}>
            <ToggleButtonGroup
              exclusive
              // El centinela es la cadena 'todas' y no null: MUI usa null para
              // "nada seleccionado", asi que un boton con value={null} nunca se
              // veria activo. Fuera del grupo el estado sigue siendo null.
              value={this.state.plantaSeleccionada ?? 'todas'}
              onChange={(event, valor) => this.elegirPlanta(valor === 'todas' ? null : valor)}
              size='small'
              sx={{ flexWrap: 'wrap', gap: 1, '& .MuiToggleButtonGroup-grouped': { border: 1, borderRadius: 1 } }}
            >
              <ToggleButton value='todas' sx={{ textTransform: 'none' }}>
                Mapa ampliado
              </ToggleButton>
              {plantas.map((planta, index) => (
                <ToggleButton
                  key={index}
                  value={index}
                  sx={{
                    textTransform: 'none',
                    '&.Mui-selected': {
                      color: planta.color,
                      borderColor: planta.color,
                      '&:hover': { borderColor: planta.color }
                    }
                  }}
                >
                  {planta.nombre}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
          <GoogleMap
            mapContainerStyle={{ height: '700px', width: '100%' }}
            center={this.state.position}
            zoom={this.state.zoom}
            mapTypeId='satellite'
            onLoad={this.addLocationButton.bind(this)}
            onClick={this.handleMapClick.bind(this)}
          >
            {plantas.map((planta, plantaIndex) =>
              planta.areas.map((area, areaIndex) => {
                if(area.type == 'polygon'){
                  return (<Polygon
                    key={`${plantaIndex}-${areaIndex}`}
                    paths={area.paths}
                    onClick={e => this.handlePolygonClick(e, area.name)}
                    visible={this.plantaVisible(plantaIndex)}
                    options={{
                      fillColor: planta.color,
                      fillOpacity: 0.01,
                      strokeColor: planta.color,
                      strokeOpacity: 0.5,
                      strokeWeight: 2
                    }}
                  />)
                } else if (area.type == 'circle') {
                  return (<Circle
                    key={`${plantaIndex}-${areaIndex}`}
                    center={area.center}
                    radius={area.radius}
                    onClick={e => this.handlePolygonClick(e, area.name)}
                    visible={this.plantaVisible(plantaIndex)}
                    options={{
                      fillColor: planta.color,
                      fillOpacity: 0.01,
                      strokeColor: planta.color,
                      strokeOpacity: 0.5,
                      strokeWeight: 2
                    }}
                  />)
                } else if (area.type == 'line') {
                  return (
                    <Polyline
                      key={`${plantaIndex}-${areaIndex}`}
                      path={area.paths}
                      onClick={e => this.handlePolygonClick(e, area.name)}
                      visible={this.plantaVisible(plantaIndex)}
                      options={{
                        strokeColor: planta.color,
                        strokeOpacity: 0.5,
                        strokeWeight: 5
                      }}
                    />
                  );
                }

                })
            )}
            {this.state.showInfoWindow && (
              <InfoWindow
                position={this.state.infoWindowPosition}
                onCloseClick={() => this.setState({ showInfoWindow: false })}
              >
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>
                  {this.state.infoWindowContent}
                </div>
              </InfoWindow>
            )}
            {this.state.userLocation && (
              <Marker
                position={this.state.userLocation}
                icon={{
                  url: `data:image/svg+xml,${encodeURIComponent(UserLocationIcon)}`
                }}
              />
            )}
          </GoogleMap>
        </div>
      </LoadScript>
    )
  }
}

export default Map

Map.acl = {
  subject: 'mapa'
}
