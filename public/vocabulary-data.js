const topicTitlesEn = {
  numbers: "Numbers and Operations",
  geometry: "Geometry",
  statistics: "Statistics and Probability",
  motion: "Motion and Forces",
  energy: "Energy and Heat",
  waves: "Waves and Electricity",
  matter: "Matter and Atoms",
  reactions: "Chemical Reactions",
  solutions: "Solutions, Acids and Bases",
  cells: "Cells",
  genetics: "Genetics",
  ecology: "Ecology",
  systems: "System Components",
  feedback: "Feedback Loops",
  modelling: "Modelling and Simulation",
  computers: "Computer Systems",
  networks: "Computer Networks",
  security: "Security"
};

function topic(id, title, keywords) {
  return {id, title, titleEn:topicTitlesEn[id], pattern:new RegExp(`\\b(?:${keywords})\\b`, "i")};
}

export const vocabularySubjects = {
  maths: {
    label: "Maths",
    labelVi: "Toán học",
    topics: [
      topic("numbers", "Số và phép tính", "number|numbers|fraction|fractions|numerator|denominator|quotient|product|difference|sum|addition|subtraction|multiplication|division|integer|integers|decimal|decimals|arithmetic|exponent|exponents|factor|factors|ratio|percent|percentage|rational|irrational"),
      topic("geometry", "Hình học", "angle|angles|triangle|triangles|rectangle|rectangular|circle|circular|radius|diameter|perimeter|area|volume|polygon|polygons|parallel|perpendicular|geometry|geometric|coordinate|coordinates|prism|cylinder|sphere|cone|congruent|quadrilateral|square|squares|line|lines|symmetry"),
      topic("statistics", "Thống kê và xác suất", "mean|median|mode|range|probability|sample|sampling|statistics|statistical|data|frequency|distribution|survey|event|events|outcome|outcomes|plot|plots|quartile|percentile|histogram|random|scatter|experimental|theoretical")
    ]
  },
  physics: {
    label: "Physics",
    labelVi: "Vật lý",
    topics: [
      topic("motion", "Chuyển động và lực", "motion|force|forces|velocity|acceleration|accelerate|speed|mass|momentum|friction|gravity|gravitational|inertia|torque|displacement|mechanical|centripetal|centrifugal|Newton|collision|impulse|projectile"),
      topic("energy", "Năng lượng và nhiệt", "energy|work|power|temperature|heat|thermal|thermodynamics|entropy|calorie|calorimeter|kinetic|potential|joule|watt|conduction|convection|radiation|specific heat|absolute zero"),
      topic("waves", "Sóng và điện", "wave|waves|wavelength|frequency|amplitude|current|voltage|resistance|electric|electrical|electricity|magnetic|magnetism|magnet|circuit|charge|charged|light|optical|optics|photon|sound|acoustics|oscillation|oscillate|refraction|reflection|diffraction|interference|spectrum|resistor|capacitor|inductor")
    ]
  },
  chemistry: {
    label: "Chemistry",
    labelVi: "Hóa học",
    topics: [
      topic("matter", "Chất và nguyên tử", "atom|atoms|atomic|molecule|molecules|molecular|element|elements|compound|compounds|mixture|mixtures|isotope|isotopes|ion|ions|ionic|electron|electrons|proton|neutron|nucleus|solid|liquid|gas|gaseous|crystal|crystalline|metal|metals|matter|periodic"),
      topic("reactions", "Phản ứng hóa học", "reaction|reactions|reactant|reactants|product|products|catalyst|catalytic|catalysis|oxidation|reduction|redox|precipitate|precipitation|combustion|decomposition|polymerization|activation|equilibrium|exothermic|endothermic|synthesis"),
      topic("solutions", "Dung dịch và axit - bazơ", "acid|acids|acidic|acidity|base|bases|basic|alkali|alkaline|alkalinity|pH|solvent|solvents|solute|solutes|solution|solutions|concentration|concentrated|dilute|dilution|solubility|soluble|titration|titrant|neutralization|aqueous|buffer|molarity|molality")
    ]
  },
  biology: {
    label: "Biology",
    labelVi: "Sinh học",
    topics: [
      topic("cells", "Tế bào", "cell|cells|cellular|nucleus|nuclei|membrane|cytoplasm|cytoplasmic|mitochondrion|mitochondria|chloroplast|chloroplasts|organelle|organelles|ribosome|ribosomes|vacuole|vacuoles|lysosome|lysosomes|cytoskeleton|mitosis|meiosis|tissue|tissues|osmosis|diffusion"),
      topic("genetics", "Di truyền học", "gene|genes|genetic|genetics|genotype|genome|chromosome|chromosomes|chromosomal|DNA|RNA|heredity|hereditary|inheritance|inherited|mutation|mutations|allele|alleles|dominant|recessive|phenotype|homozygous|heterozygous|nucleotide|nucleotides|transcription|translation"),
      topic("ecology", "Sinh thái học", "ecology|ecological|ecosystem|ecosystems|habitat|habitats|population|populations|community|communities|producer|producers|consumer|consumers|environment|environmental|biotic|abiotic|biodiversity|biome|biosphere|food chain|food web|trophic|predator|predation|prey|symbiosis|parasitism|decomposer|decomposers|succession|conservation")
    ]
  },
  engineering: {
    label: "Engineering",
    labelVi: "Kỹ thuật",
    topics: [
      topic("systems", "Thành phần hệ thống", "system|systems|boundary|stock|stocks|flow|flows|parameters|structure|accumulation|aggregation|connector|converter|inflow|outflow|level|variable|variables"),
      topic("feedback", "Vòng phản hồi", "feedback|loop|loops|balancing|reinforcing|delay|overshoot|oscillation|goal|growth|decay|amplification|counteracting|equilibrium|stability|compounding"),
      topic("modelling", "Mô hình hóa và mô phỏng", "simulation|model|models|modeling|modelling|dynamic|dynamics|analysis|equation|equations|integration|interval|diagram|graph|graphs|numerical|sensitivity|time|Euler|Runge|DT")
    ]
  },
  it: {
    label: "IT",
    labelVi: "Công nghệ thông tin",
    topics: [
      topic("computers", "Hệ thống máy tính", "memory|cache|caching|computer|processor|process|processes|operating system|kernel|thread|threads|virtual|machine|machines|hardware|software|stack|instruction|register|address|storage|page|paging"),
      topic("networks", "Mạng máy tính", "packet|packets|router|routing|network|networks|protocol|bandwidth|latency|TCP|IP|DNS|ethernet|port|channel|connection|link|datagram|broadcast|multicast|unicast|end-to-end|congestion"),
      topic("security", "Bảo mật", "authentication|authorization|encrypt|encryption|encrypted|decrypt|decryption|key|keys|security|secure|attack|attacker|adversary|protection|certificate|confidentiality|integrity|privacy|firewall|access control|cryptographic|cryptography|principal|principals|permission|permissions")
    ]
  }
};

export function bankTerms(subjectId, bank) {
  const subject = vocabularySubjects[subjectId];
  if (!subject || bank.subject !== subjectId || !Array.isArray(bank.terms)) throw new Error("Invalid vocabulary bank");
  return bank.terms.map((term, index) => ({
    ...term, id:`${subjectId}-${index}`, source:bank.source,
    topics:subject.topics.filter(topic => topic.pattern.test(term.word)).map(topic => topic.id)
  }));
}

export async function loadVocabulary(subjectId) {
  const url = new URL(`./assets/vocabulary/${subjectId}-practice.json?v=62`, import.meta.url);
  const response = await fetch(url);
  if (!response.ok) throw new Error("Vocabulary file unavailable");
  return bankTerms(subjectId, await response.json());
}

export function topicTerms(subjectId, topicId, terms) {
  if (!vocabularySubjects[subjectId]) return [];
  return topicId === "all" ? [...terms] : terms.filter(term => term.topics.includes(topicId));
}
