/** Curated paper summaries, not a calibration dataset. Keep findings and model use separate. */
export interface ResearchApproach {
  slug: string
  title: string
  eyebrow: string
  summary: string
  mechanism: string
  finding: string
  limitation: string
  application: string
  modelUse: string
  coverage: 'Illustrative control' | 'Research context'
  paper: { title: string; authors: string; year: number; journal: string; doi: string; url: string; method: string; geography: string; metric: string; locator: string }
}

export const RESEARCH_REVIEWED = '2026-09-20'
export const research: ResearchApproach[] = [
  {
    slug: 'tree-canopy', title: 'Build connected shade', eyebrow: '01 / Trees & streets',
    summary: 'Tree placement and the surrounding pavement matter as much as a citywide canopy target.',
    mechanism: 'Canopy intercepts sunlight. Transpiration transfers energy into water vapour; paved surfaces beneath trees receive less solar energy.',
    finding: 'Bicycle-mounted sensors in Madison found nonlinear daytime air-temperature cooling, with stronger effects above roughly 40% canopy at a 60–90 m neighbourhood scale.',
    limitation: 'This is a summer field study in Wisconsin, not a universal 40% threshold or an Indian-city temperature coefficient.',
    application: 'A question to test locally: can connected shade along walking routes reduce exposure more effectively than scattered planting?',
    modelUse: 'Explore canopy in the simulator. Its linear coefficient and range remain unvalidated by this paper; the measured response is nonlinear.',
    coverage: 'Illustrative control',
    paper: { title: 'Scale-dependent interactions between tree canopy cover and impervious surfaces reduce daytime urban heat during summer', authors: 'Ziter et al.', year: 2019, journal: 'PNAS', doi: '10.1073/pnas.1817561116', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6462107/', method: 'Mobile field measurements', geography: 'Madison, Wisconsin, USA', metric: 'Near-surface air temperature', locator: 'Abstract; Results; Where Should Trees Be Planted to Cool the City Most Effectively?' },
  },
  {
    slug: 'surface-aware-greening', title: 'Look beyond a green pixel', eyebrow: '02 / Surfaces & soil',
    summary: 'A lawn, a mature tree and a paved square have different thermal behaviour.',
    mechanism: 'Shade, surface materials and available moisture alter how incoming sunlight is partitioned into stored heat and evaporation.',
    finding: 'Satellite observations across 293 European cities found cooler summer surfaces under trees than in continuous urban fabric. Treeless green spaces generally provided less surface cooling, with large regional differences.',
    limitation: 'Satellite land-surface temperature is not the air temperature people breathe. European contrasts cannot be used as local Indian cooling predictions.',
    application: 'Compare shaded and exposed surfaces locally, recording soil moisture and surface material alongside canopy cover.',
    modelUse: 'Canopy and built-up controls illustrate a trade-off. The model does not resolve species, soil moisture, pavement materials or separate lawns from trees.',
    coverage: 'Illustrative control',
    paper: { title: 'The role of urban trees in reducing land surface temperatures in European cities', authors: 'Schwaab et al.', year: 2021, journal: 'Nature Communications', doi: '10.1038/s41467-021-26768-w', url: 'https://www.nature.com/articles/s41467-021-26768-w', method: 'Multi-city satellite analysis', geography: '293 European cities', metric: 'Land-surface temperature (LST)', locator: 'Abstract; Introduction; Discussion' },
  },
  {
    slug: 'blue-green-infrastructure', title: 'Give water room to work', eyebrow: '03 / Water & landscapes',
    summary: 'Wetlands, rain gardens and trees can be planned as a connected cooling landscape.',
    mechanism: 'Vegetation and water exchange heat through evaporation; rain gardens also make space for infiltration. Cooling depends on water availability and design.',
    finding: 'A systematic review assessed 202 publications covering 51 types of green, blue and grey infrastructure. Cooling differed substantially by intervention and context.',
    limitation: 'The review combines different climates, scales and measurement methods. A pooled cooling result does not establish a fixed effect per square kilometre of lake.',
    application: 'Evaluate water supply, drainage, water quality and maintenance together when planning a wetland or rain garden.',
    modelUse: 'Water area is an illustrative control where baseline data exists. Runoff, groundwater recharge, humidity and biodiversity are not calculated. Mumbai water-area data is unavailable.',
    coverage: 'Illustrative control',
    paper: { title: 'Urban heat mitigation by green and blue infrastructure: Drivers, effectiveness, and future needs', authors: 'Kumar et al.', year: 2024, journal: 'The Innovation', doi: '10.1016/j.xinn.2024.100588', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10909648/', method: 'Systematic literature review', geography: 'Multiple cities and climates', metric: 'Cooling metrics vary across studies', locator: 'Summary; Methods; Discussion and future research needs' },
  },
  {
    slug: 'cool-roofs', title: 'Reflect heat at the roof', eyebrow: '04 / Buildings & energy',
    summary: 'Reflective roofs offer another approach where street-level planting space is limited.',
    mechanism: 'Higher roof reflectance sends more sunlight away before it becomes heat. Building and neighbourhood effects depend on roof area and urban form.',
    finding: 'A London modelling study compared nine interventions during two hot days in 2018. Extensive cool-roof deployment reduced modelled 2 m air temperature by about 1.2°C on average.',
    limitation: 'This is a specific simulated deployment in London, not a measured Indian-city benefit or a per-roof saving.',
    application: 'Test reflectance, ageing, indoor temperatures and cooling-energy demand in local buildings before scaling a programme.',
    modelUse: 'Research context only. Taap has no roof-albedo or building-energy model, so this result is not added to the temperature readout.',
    coverage: 'Research context',
    paper: { title: 'Cool Roofs Could Be Most Effective at Reducing Outdoor Urban Temperatures in London …', authors: 'Brousse et al.', year: 2024, journal: 'Geophysical Research Letters', doi: '10.1029/2024GL109634', url: 'https://discovery.ucl.ac.uk/id/eprint/10195643/', method: 'WRF BEP-BEM numerical experiment', geography: 'Greater London, United Kingdom', metric: 'Modelled air temperature at 2 m', locator: 'Abstract; published version, intervention comparisons' },
  },
  {
    slug: 'cleaner-transport', title: 'Reduce pollution at its source', eyebrow: '05 / Mobility & air',
    summary: 'Exhaust and road dust need their own intervention strategy alongside urban cooling.',
    mechanism: 'Traffic contributes exhaust particles and resuspended road dust. Ambient concentrations also depend on weather, other sources and pollution transported into the city.',
    finding: 'A Greater Bengaluru emissions inventory and dispersion study identified transport, including exhaust and road dust, as a major particulate-emissions source.',
    limitation: 'Emissions shares are not ambient concentration changes. Fleet composition, travel demand and meteorology prevent a simple universal vehicles-to-PM2.5 conversion.',
    application: 'Compare public transport, cleaner fleets and dust management using local activity data and monitored pollution.',
    modelUse: 'The vehicle slider changes illustrative PM2.5 only. It does not calculate CO₂, direct waste heat or a health outcome; its marginal coefficient remains unverified.',
    coverage: 'Illustrative control',
    paper: { title: 'Air quality, emissions, and source contributions analysis for the Greater Bengaluru region of India', authors: 'Guttikunda et al.', year: 2019, journal: 'Atmospheric Pollution Research', doi: '10.1016/j.apr.2019.01.002', url: 'https://urbanemissions.info/wp-content/uploads/docs/2019-01-APR-AQ-Bengaluru.pdf', method: 'Emissions inventory and dispersion modelling', geography: 'Greater Bengaluru, India', metric: 'Emissions and ambient particulate concentrations', locator: 'Abstract; emission inventory; source contributions' },
  },
  {
    slug: 'equitable-cooling', title: 'Put cooling where people need it', eyebrow: '06 / Exposure & access',
    summary: 'A city average can hide the neighbourhoods with the least access to cooling.',
    mechanism: 'The location and quality of greenery influence who benefits. Population-weighted exposure can reveal gaps that total green area misses.',
    finding: 'Remote-sensing analysis of roughly 500 large cities found substantial inequality in green-space cooling between the Global South and Global North.',
    limitation: 'The analysis uses surface temperature and population-based exposure estimates. It does not directly measure individual thermal comfort or health outcomes.',
    application: 'Combine local heat measurements with access to shade at homes, workplaces and everyday destinations before prioritising projects.',
    modelUse: 'Research context only. Taap’s population field is contextual; it does not calculate vulnerability, heat illness or a population-weighted benefit.',
    coverage: 'Research context',
    paper: { title: 'Green spaces provide substantial but unequal urban cooling globally', authors: 'Li et al.', year: 2024, journal: 'Nature Communications', doi: '10.1038/s41467-024-51355-0', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11369290/', method: 'Global remote-sensing analysis', geography: 'Approximately 500 large cities worldwide', metric: 'Surface cooling and population-weighted cooling benefit', locator: 'Abstract; Quantifying cooling inequality' },
  },
]

export function getResearch(slug: string) { return research.find(item => item.slug === slug) }

export const cityStories: Record<string, { setting: string; question: string; approaches: string[] }> = {
  bangalore: { setting: 'Trees, lakes and a growing built footprint', question: 'What changes when shaded streets and connected lakes give way to more sealed surfaces?', approaches: ['tree-canopy', 'blue-green-infrastructure', 'cleaner-transport'] },
  delhi: { setting: 'Summer heat, hard surfaces and polluted air', question: 'How do shade, reflective roofs and transport choices address different parts of the environmental burden?', approaches: ['tree-canopy', 'cool-roofs', 'cleaner-transport'] },
  mumbai: { setting: 'Dense neighbourhoods in a coastal climate', question: 'Where can shade and reflective surfaces help when planting space is limited? Humidity and sea breezes require local study.', approaches: ['surface-aware-greening', 'cool-roofs', 'equitable-cooling'] },
  chennai: { setting: 'Coastal heat, wetlands and urban growth', question: 'How can water-sensitive planning and connected shade work together? Cooler surfaces do not automatically mean lower humid heat.', approaches: ['blue-green-infrastructure', 'tree-canopy', 'equitable-cooling'] },
}
