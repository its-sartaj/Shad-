import { Course, MockTest, NotificationAlert, StudyNote } from '../types';
import heroCoachingCampusImg from '../assets/images/hero_coaching_campus_1794734669988.jpg';
import coursePhysicsOpticsImg from '../assets/images/course_physics_optics_1794734671066.jpg';
import courseChemistryLabImg from '../assets/images/course_chemistry_lab_1794734671257.jpg';
import courseMathematicsBoardImg from '../assets/images/course_mathematics_board_1794734671995.jpg';

export const HERO_IMAGE_PATH = heroCoachingCampusImg;
export const DEFAULT_COURSE_IMAGE = coursePhysicsOpticsImg;
export const POSTER_IMAGE_PATH = '/assets/aistudio/WhatsApp_Image_2026-11-15_at_14.31.46_ae9b6066.jpeg';

export const TOPPERS_2024 = [
  { name: 'Mohammad Safaullah', marks: 422, outOf: 500, stream: 'I.Sc. (12th Board)' },
  { name: 'Md Shahid Hussin', marks: 406, outOf: 500, stream: 'I.Sc. (12th Board)' },
  { name: 'Saloni Kumari', marks: 401, outOf: 500, stream: 'I.Sc. (12th Board)' },
  { name: 'Archana Kumari', marks: 370, outOf: 500, stream: 'I.Sc. (12th Board)' },
  { name: 'Md Parwej Alam', marks: 366, outOf: 500, stream: 'I.Sc. (12th Board)' },
  { name: 'Akash Kumar', marks: 359, outOf: 500, stream: 'I.Sc. (12th Board)' },
  { name: 'Vicky Kumar', marks: 345, outOf: 500, stream: 'I.Sc. (12th Board)' },
  { name: 'Sakshi Kumari', marks: 300, outOf: 500, stream: 'I.Sc. (12th Board)' },
];

export const INITIAL_COURSES: Course[] = [
  {
    id: 'course_12th_target_batch',
    title: 'Class 12th I.Sc. Target Batch',
    board: 'BSEB & CBSE',
    className: '12th I.Sc.',
    subjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
    faculty: 'Er. M.N. Alam (Phy, Chem, Math) · Md Ejaz Alam (Bio)',
    schedule: 'Morning 6:30 AM – 10:30 AM · Mon–Sat',
    startDate: '1 December Batch',
    feeAmount: 7500,
    feeLabel: '₹7,500 / Year (or ₹800/mo)',
    description:
      'Complete 12th Science syllabus coverage with daily numerical practice, bilingual NCERT derivations, weekly OMR + online test series, and board model paper drills.',
    imageUrl: coursePhysicsOpticsImg,
    active: true,
    createdBy: 'system',
  },
  {
    id: 'course_11th_foundation',
    title: 'Class 11th I.Sc. Foundation Batch',
    board: 'BSEB & CBSE',
    className: '11th I.Sc.',
    subjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
    faculty: 'Er. M.N. Alam (Phy, Chem, Math) · Md Ejaz Alam (Bio)',
    schedule: 'Afternoon 2:00 PM – 5:00 PM · Mon–Sat',
    startDate: 'Admissions Open',
    feeAmount: 6500,
    feeLabel: '₹6,500 / Year (or ₹700/mo)',
    description:
      'Strong conceptual foundation for Class 11th Science covering Mechanics, Organic Basics, Trigonometry, and Calculus with offline chapter notes and weekly doubt clinics.',
    imageUrl: courseChemistryLabImg,
    active: true,
    createdBy: 'system',
  },
  {
    id: 'course_board_test_crash',
    title: '12th Board Booster & Test Series',
    board: 'BSEB & CBSE',
    className: 'Target Crash Course',
    subjects: ['Physics', 'Chemistry', 'Mathematics', 'English & Hindi'],
    faculty: 'Er. M.N. Alam (Physics, Chemistry & Mathematics)',
    schedule: 'Evening 4:00 PM – 6:30 PM · Daily',
    startDate: 'Revision + 20 Mock Tests',
    feeAmount: 1999,
    feeLabel: '₹1,999 Full Test + Notes Pack',
    description:
      'High-yield revision of 5-mark long derivations, 50% objective OMR/CBT practice tests, and previous 10-year BSEB & CBSE board paper solutions with certificate evaluation.',
    imageUrl: courseMathematicsBoardImg,
    active: true,
    createdBy: 'system',
  },
];

export const INITIAL_NOTES: StudyNote[] = [
  {
    id: 'note_phy_electrostatics_12',
    title: 'Electrostatics: Gauss Law, Electric Flux & Dipole Derivations',
    subject: 'Physics',
    className: '12th',
    board: 'Both',
    chapter: 'Chapter 1 & 2 · Electrostatics',
    summary: `Key Formulae & Board Derivations (B.S.E.B. & C.B.S.E.):

1. Coulomb's Law in Vector Form:
   F = (1 / 4πε₀) · (q₁q₂ / r²) r̂, where 1 / 4πε₀ = 9 × 10⁹ N·m²/C².

2. Electric Field on Axial & Equatorial Line of a Dipole:
   - Axial Field: E_axial = (1 / 4πε₀) · (2p / r³) for r >> a.
   - Equatorial Field: E_eq = (1 / 4πε₀) · (p / r³) opposite to dipole moment p.
   - Relation: E_axial = 2 · E_eq.

3. Gauss's Theorem (5-Mark Important Board Proof):
   Φ = ∮ E · dA = q_enclosed / ε₀.
   - Field due to infinite line charge: E = λ / (2πε₀r).
   - Field due to infinite plane sheet: E = σ / (2ε₀).

4. Capacitance of Parallel Plate Capacitor:
   - Air medium: C₀ = ε₀A / d.
   - With dielectric slab of thickness t and constant K: C = ε₀A / (d - t + t/K).
   - Energy stored: U = ½ CV² = ½ Q²/C = ½ QV.`,
    fileName: 'SCC_12th_Physics_Electrostatics.pdf',
    fileSizeLabel: 'Offline Ready · 14 Pages',
    authorName: 'Er. M.N. Alam',
    uploadedBy: 'system',
  },
  {
    id: 'note_chem_solutions_12',
    title: 'Solutions & Electrochemistry: Raoult Law, Nernst Equation & Molarity',
    subject: 'Chemistry',
    className: '12th',
    board: 'Both',
    chapter: 'Chapter 1 & 2 · Physical Chemistry',
    summary: `High-Yield Revision Sheet:

1. Concentration Terms (Temperature Independent vs Dependent):
   - Molality (m) & Mole Fraction (χ) are temperature independent.
   - Molarity (M) = (w_B × 1000) / (M_B × V_mL) depends on temperature.

2. Raoult's Law & Colligative Properties:
   - Relative lowering of vapour pressure: (p⁰ - p) / p⁰ = χ_solute.
   - Elevation in boiling point: ΔT_b = i · K_b · m.
   - Depression in freezing point: ΔT_f = i · K_f · m.
   - Osmotic pressure: π = i · C · R · T.

3. Nernst Equation at 298 K:
   E_cell = E°_cell - (0.0591 / n) · log₁₀([Anode] / [Cathode]).
   At equilibrium: E°_cell = (0.0591 / n) · log₁₀(K_c).

4. Kohlrausch's Law:
   Λ°_m (AxBy) = x·λ°(A^y+) + y·λ°(B^x-). Used to calculate degree of dissociation α = Λ_m / Λ°_m.`,
    fileName: 'SCC_12th_Chemistry_Solutions_Electrochem.pdf',
    fileSizeLabel: 'Offline Ready · 11 Pages',
    authorName: 'Er. M.N. Alam',
    uploadedBy: 'system',
  },
  {
    id: 'note_math_calculus_12',
    title: 'Definite Integration & Differential Equations: Board Master Sheet',
    subject: 'Mathematics',
    className: '12th',
    board: 'Both',
    chapter: 'Unit 3 · Calculus (44 Marks Weightage)',
    summary: `Most Repeated Board Theorems & Properties:

1. King's Property (Most Asked in BSEB & CBSE 5-Mark):
   ∫₀ᵃ f(x) dx = ∫₀ᵃ f(a - x) dx.
   Example: Evaluate I = ∫₀^(π/2) [√sin x / (√sin x + √cos x)] dx → Answer = π/4.

2. Even / Odd Function Property:
   ∫₋ₐᵃ f(x) dx = 2 ∫₀ᵃ f(x) dx if f(-x) = f(x) (Even), and 0 if f(-x) = -f(x) (Odd).

3. Standard Integrals:
   - ∫ dx / (x² + a²) = (1/a) tan⁻¹(x/a) + C
   - ∫ dx / √(a² - x²) = sin⁻¹(x/a) + C
   - ∫ eˣ [f(x) + f'(x)] dx = eˣ f(x) + C.

4. Linear Differential Equation:
   dy/dx + Py = Q → Integrating Factor (I.F.) = e^(∫P dx).
   Solution: y · (I.F.) = ∫ Q · (I.F.) dx + C.`,
    fileName: 'SCC_12th_Math_Calculus_Master.pdf',
    fileSizeLabel: 'Offline Ready · 16 Pages',
    authorName: 'Er. M.N. Alam',
    uploadedBy: 'system',
  },
  {
    id: 'note_bio_genetics_12',
    title: 'Molecular Basis of Inheritance: DNA Replication, Lac Operon & Transcription',
    subject: 'Biology',
    className: '12th',
    board: 'Both',
    chapter: 'Chapter 5 · Genetics & Evolution',
    summary: `NCERT & Board Diagram Checklist:

1. Structure of DNA (Watson & Crick Model):
   - Two antiparallel polynucleotide chains (5'→3' and 3'→5').
   - Chargaff's Rule: A = T (2 H-bonds), G ≡ C (3 H-bonds). Pitch = 3.4 nm (10 bp).

2. Semi-Conservative DNA Replication (Meselson & Stahl, 1958):
   - Enzymes: DNA Helicase (unwinds), DNA Polymerase III (synthesizes 5'→3'), DNA Ligase (joins Okazaki fragments on lagging strand).

3. Central Dogma:
   DNA —(Transcription)—> mRNA —(Translation)—> Protein.

4. Lac Operon (Jacob & Monod):
   - i gene codes for repressor protein.
   - Structural genes: z (β-galactosidase), y (permease), a (transacetylase).
   - Lactose acts as an inducer binding the repressor so RNA polymerase transcribes z, y, a.`,
    fileName: 'SCC_12th_Biology_Molecular_Genetics.pdf',
    fileSizeLabel: 'Offline Ready · 10 Pages',
    authorName: 'Md Ejaz Alam',
    uploadedBy: 'system',
  },
  {
    id: 'note_phy_kinematics_11',
    title: 'Class 11th Mechanics: Projectile Motion, Laws of Motion & Friction',
    subject: 'Physics',
    className: '11th',
    board: 'Both',
    chapter: 'Chapter 3 & 4 · Kinematics & NLM',
    summary: `Class 11th Foundation Key Results:

1. Equations of Uniformly Accelerated Motion:
   v = u + at; s = ut + ½at²; v² = u² + 2as; s_nth = u + (a/2)(2n - 1).

2. Oblique Projectile Motion (angle θ with horizontal):
   - Time of Flight: T = (2u sin θ) / g.
   - Maximum Height: H = (u² sin² θ) / (2g).
   - Horizontal Range: R = (u² sin 2θ) / g (Maximum at θ = 45°).

3. Banking of Roads (with friction μ):
   v_max = √[rg · (μ + tan θ) / (1 - μ tan θ)].`,
    fileName: 'SCC_11th_Physics_Mechanics.pdf',
    fileSizeLabel: 'Offline Ready · 9 Pages',
    authorName: 'Er. M.N. Alam',
    uploadedBy: 'system',
  },
];

export const INITIAL_TESTS: MockTest[] = [
  {
    id: 'test_phy_12_electro_optics',
    title: '12th Physics Mock Test 01: Electrostatics & Ray Optics',
    subject: 'Physics',
    className: '12th',
    board: 'BSEB & CBSE',
    durationMinutes: 20,
    totalMarks: 20,
    passMarks: 12,
    isCertificationTest: true,
    courseId: 'course_12th_target_batch',
    questions: [
      {
        id: 'q1',
        question: 'What is the SI unit of Electric Flux (Φ)?',
        options: ['N·m²/C', 'N/C', 'C/m²', 'Joule/Coulomb'],
        correctIndex: 0,
        marks: 4,
        explanation: 'Electric flux Φ = E·A = (N/C)·m² = N·m²/C (also equivalent to Volt·meter).',
      },
      {
        id: 'q2',
        question: 'If the distance between two point charges is doubled, the electrostatic force between them becomes:',
        options: ['Double', 'One-fourth', 'Half', 'Four times'],
        correctIndex: 1,
        marks: 4,
        explanation: 'By Coulomb’s Law, F ∝ 1/r². Doubling r makes F equal to 1/4 of its original value.',
      },
      {
        id: 'q3',
        question: 'The power of a convex lens of focal length 25 cm in air is:',
        options: ['+2 D', '-4 D', '+4 D', '+0.25 D'],
        correctIndex: 2,
        marks: 4,
        explanation: 'Power P = 100 / f(cm) = 100 / 25 = +4 Dioptre.',
      },
      {
        id: 'q4',
        question: 'Total internal reflection occurs when light travels from:',
        options: [
          'Rarer to denser medium at any angle',
          'Denser to rarer medium with angle of incidence greater than critical angle',
          'Denser to rarer medium at 0° incidence',
          'Vacuum to glass',
        ],
        correctIndex: 1,
        marks: 4,
        explanation: 'TIR requires light moving from optically denser to rarer medium with i > i_c.',
      },
      {
        id: 'q5',
        question: 'Two capacitors of 6 μF and 3 μF are connected in series. Their equivalent capacitance is:',
        options: ['9 μF', '2 μF', '4.5 μF', '1.5 μF'],
        correctIndex: 1,
        marks: 4,
        explanation: 'In series: 1/C_eq = 1/6 + 1/3 = 3/6 = 1/2 ⇒ C_eq = 2 μF.',
      },
    ],
    createdBy: 'system',
  },
  {
    id: 'test_math_12_calculus',
    title: '12th Mathematics Mock Test 02: Differentiation & Integrals',
    subject: 'Mathematics',
    className: '12th',
    board: 'BSEB & CBSE',
    durationMinutes: 20,
    totalMarks: 20,
    passMarks: 12,
    isCertificationTest: true,
    courseId: 'course_board_test_crash',
    questions: [
      {
        id: 'm1',
        question: 'What is the derivative d/dx [sin(x²)]?',
        options: ['cos(x²)', '2x cos(x²)', '2x sin(x²)', '-2x cos(x²)'],
        correctIndex: 1,
        marks: 4,
        explanation: 'By chain rule: d/dx [sin(x²)] = cos(x²) · d/dx(x²) = 2x cos(x²).',
      },
      {
        id: 'm2',
        question: 'Evaluate ∫₀^(π/2) [sin x / (sin x + cos x)] dx:',
        options: ['π/2', 'π/4', '0', '1'],
        correctIndex: 1,
        marks: 4,
        explanation: 'Using King’s property I = ∫₀^(π/2) f(π/2 - x) dx, adding 2I = π/2 gives I = π/4.',
      },
      {
        id: 'm3',
        question: 'What is the order and degree of the differential equation (d²y/dx²)³ + (dy/dx)² + y = 0?',
        options: ['Order 3, Degree 2', 'Order 2, Degree 3', 'Order 2, Degree 2', 'Order 1, Degree 3'],
        correctIndex: 1,
        marks: 4,
        explanation: 'Highest derivative is d²y/dx² (order 2) and its highest power is 3 (degree 3).',
      },
      {
        id: 'm4',
        question: 'The value of ∫ eˣ (tan x + sec² x) dx is:',
        options: ['eˣ sec² x + C', 'eˣ tan x + C', 'eˣ cot x + C', 'tan x + C'],
        correctIndex: 1,
        marks: 4,
        explanation: 'Since d/dx(tan x) = sec² x, ∫ eˣ[f(x) + f’(x)]dx = eˣ f(x) + C = eˣ tan x + C.',
      },
      {
        id: 'm5',
        question: 'If A is a square matrix of order 3 and |A| = 5, then |2A| equals:',
        options: ['10', '20', '40', '25'],
        correctIndex: 2,
        marks: 4,
        explanation: '|kA| = kⁿ |A| for order n = 3, so |2A| = 2³ × 5 = 8 × 5 = 40.',
      },
    ],
    createdBy: 'system',
  },
  {
    id: 'test_chem_12_board',
    title: '12th Chemistry Practice Test: Solutions & Coordination Compounds',
    subject: 'Chemistry',
    className: '12th',
    board: 'BSEB & CBSE',
    durationMinutes: 15,
    totalMarks: 16,
    passMarks: 10,
    isCertificationTest: false,
    courseId: 'course_12th_target_batch',
    questions: [
      {
        id: 'c1',
        question: 'Which concentration term is independent of temperature?',
        options: ['Molarity', 'Normality', 'Molality', 'Formality'],
        correctIndex: 2,
        marks: 4,
        explanation: 'Molality depends only on mass of solvent (kg), which does not change with temperature.',
      },
      {
        id: 'c2',
        question: 'What is the oxidation number of Fe in K₄[Fe(CN)₆]?',
        options: ['+3', '+2', '+4', '0'],
        correctIndex: 1,
        marks: 4,
        explanation: '4(+1) + x + 6(-1) = 0 ⇒ x = +2.',
      },
      {
        id: 'c3',
        question: 'Which of the following is a colligative property?',
        options: ['Surface tension', 'Viscosity', 'Osmotic pressure', 'Refractive index'],
        correctIndex: 2,
        marks: 4,
        explanation: 'Osmotic pressure depends only on the number of solute particles, not their chemical nature.',
      },
      {
        id: 'c4',
        question: 'In the reaction 2H₂O₂ → 2H₂O + O₂, the order of reaction is:',
        options: ['Zero order', 'First order', 'Second order', 'Third order'],
        correctIndex: 1,
        marks: 4,
        explanation: 'Decomposition of H₂O₂ follows first-order kinetics.',
      },
    ],
    createdBy: 'system',
  },
];

export const INITIAL_NOTIFICATIONS: NotificationAlert[] = [
  {
    id: 'notif_12th_dec_batch',
    title: 'New 12th I.Sc. Batch Starting 1 December',
    message:
      'Registration is open for the new Class 12th B.S.E.B. & C.B.S.E. Science batch at Phenhara campus. Morning timing: 6:30 AM.',
    category: 'batch',
    dueDate: '1 Dec',
    createdBy: 'system',
  },
  {
    id: 'notif_phy_deadline',
    title: 'Electrostatics Numerical Assignment & Test Deadline',
    message:
      'Complete Electrostatics Chapter 1–2 notes and submit Physics Mock Test 01 before Sunday 8:00 PM to unlock your merit certificate.',
    category: 'deadline',
    dueDate: 'Sunday 8:00 PM',
    createdBy: 'system',
  },
  {
    id: 'notif_2024_results',
    title: 'Intermediate Result 2024 Merit Roll Published',
    message:
      'Congratulations to Mohammad Safaullah (422), Md Shahid Hussin (406), and Saloni Kumari (401) for topping Phenhara Block!',
    category: 'result',
    dueDate: '2024 Merit List',
    createdBy: 'system',
  },
];
