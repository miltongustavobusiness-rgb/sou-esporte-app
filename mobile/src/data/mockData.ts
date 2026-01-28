// Dados Mock para o App Sou Esporte

export const mockUser = {
  id: '1',
  name: 'João Silva',
  email: 'joao.silva@email.com',
  cpf: '123.456.789-00',
  phone: '(11) 99999-9999',
  birthDate: '1990-05-15',
  gender: 'M',
  avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
  city: 'São Paulo',
  state: 'SP',
  shirtSize: 'M',
  bloodType: 'O+',
  emergencyContact: 'Maria Silva - (11) 98888-8888',
  stats: {
    totalRaces: 24,
    totalDistance: 312.5,
    averagePace: '5:45',
    bestPace: '4:32',
    podiums: 3,
    firstPlaces: 1,
  },
};

export const mockEvents = [
  {
    id: '1',
    title: 'Maratona de São Paulo 2025',
    subtitle: 'A maior maratona da América Latina',
    date: '2025-04-06',
    time: '06:00',
    location: 'Av. Paulista, São Paulo - SP',
    city: 'São Paulo',
    state: 'SP',
    image: 'https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=800',
    bannerImage: 'https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=1200',
    description: 'A Maratona de São Paulo é o maior evento de corrida de rua da América Latina. Com percurso que passa pelos principais pontos turísticos da cidade, o evento atrai milhares de corredores de todo o mundo.',
    totalSpots: 30000,
    registeredCount: 24567,
    price: 250.00,
    isFeatured: true,
    status: 'open',
    organizer: {
      id: '1',
      name: 'Yescom Eventos',
      logo: 'https://via.placeholder.com/100',
    },
    categories: [
      { id: '1', name: '42K - Maratona', distance: '42.195 km', price: 350.00, spotsLeft: 2500 },
      { id: '2', name: '21K - Meia Maratona', distance: '21.097 km', price: 250.00, spotsLeft: 3200 },
      { id: '3', name: '10K', distance: '10 km', price: 150.00, spotsLeft: 5000 },
      { id: '4', name: '5K - Corrida e Caminhada', distance: '5 km', price: 100.00, spotsLeft: 8000 },
    ],
    kits: [
      { id: '1', name: 'Kit Básico', description: 'Camiseta + Número de peito + Chip', price: 0, included: true },
      { id: '2', name: 'Kit Premium', description: 'Camiseta + Número + Chip + Mochila + Boné', price: 80.00, included: false },
      { id: '3', name: 'Kit VIP', description: 'Kit Premium + Acesso área VIP + Massagem pós-prova', price: 200.00, included: false },
    ],
    route: {
      startPoint: { lat: -23.5614, lng: -46.6565 },
      endPoint: { lat: -23.5614, lng: -46.6565 },
      distance: '42.195 km',
      elevation: '180m',
      mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3657.1975!2d-46.6565!3d-23.5614!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDMzJzQxLjAiUyA0NsKwMzknMjMuNCJX!5e0!3m2!1spt-BR!2sbr!4v1234567890',
    },
    gallery: [
      'https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=400',
      'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400',
      'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=400',
      'https://images.unsplash.com/photo-1486218119243-13883505764c?w=400',
    ],
    regulations: 'https://example.com/regulamento.pdf',
  },
  {
    id: '2',
    title: 'Corrida Noturna Rio',
    subtitle: 'Corra sob as estrelas',
    date: '2025-03-15',
    time: '19:00',
    location: 'Aterro do Flamengo, Rio de Janeiro - RJ',
    city: 'Rio de Janeiro',
    state: 'RJ',
    image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800',
    bannerImage: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1200',
    description: 'Uma experiência única de correr à noite com vista para o Pão de Açúcar e a Baía de Guanabara iluminados. Percurso plano e seguro.',
    totalSpots: 8000,
    registeredCount: 6234,
    price: 120.00,
    isFeatured: true,
    status: 'open',
    organizer: {
      id: '2',
      name: 'Rio Running',
      logo: 'https://via.placeholder.com/100',
    },
    categories: [
      { id: '1', name: '10K', distance: '10 km', price: 120.00, spotsLeft: 800 },
      { id: '2', name: '5K', distance: '5 km', price: 80.00, spotsLeft: 1200 },
    ],
    kits: [
      { id: '1', name: 'Kit Padrão', description: 'Camiseta refletiva + Número + Chip', price: 0, included: true },
      { id: '2', name: 'Kit Completo', description: 'Kit Padrão + Lanterna de cabeça + Pulseira LED', price: 50.00, included: false },
    ],
    route: {
      startPoint: { lat: -22.9340, lng: -43.1729 },
      endPoint: { lat: -22.9340, lng: -43.1729 },
      distance: '10 km',
      elevation: '50m',
    },
    gallery: [
      'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400',
      'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=400',
    ],
  },
  {
    id: '3',
    title: 'Trail Run Serra da Mantiqueira',
    subtitle: 'Desafie seus limites na montanha',
    date: '2025-05-10',
    time: '07:00',
    location: 'Campos do Jordão - SP',
    city: 'Campos do Jordão',
    state: 'SP',
    image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800',
    bannerImage: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1200',
    description: 'Uma prova desafiadora em meio à natureza exuberante da Serra da Mantiqueira. Trilhas técnicas e paisagens de tirar o fôlego.',
    totalSpots: 1500,
    registeredCount: 1234,
    price: 180.00,
    isFeatured: false,
    status: 'open',
    organizer: {
      id: '3',
      name: 'Trail Brasil',
      logo: 'https://via.placeholder.com/100',
    },
    categories: [
      { id: '1', name: '42K Ultra', distance: '42 km', price: 280.00, spotsLeft: 50 },
      { id: '2', name: '21K Trail', distance: '21 km', price: 180.00, spotsLeft: 120 },
      { id: '3', name: '10K Iniciante', distance: '10 km', price: 120.00, spotsLeft: 200 },
    ],
    kits: [
      { id: '1', name: 'Kit Trail', description: 'Camiseta técnica + Número + Chip + Mochila hidratação', price: 0, included: true },
    ],
    route: {
      startPoint: { lat: -22.7396, lng: -45.5913 },
      endPoint: { lat: -22.7396, lng: -45.5913 },
      distance: '21 km',
      elevation: '1200m',
    },
    gallery: [
      'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400',
    ],
  },
  {
    id: '4',
    title: 'Meia Maratona de Curitiba',
    subtitle: 'Corra pela cidade mais verde do Brasil',
    date: '2025-06-22',
    time: '07:30',
    location: 'Parque Barigui, Curitiba - PR',
    city: 'Curitiba',
    state: 'PR',
    image: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800',
    bannerImage: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=1200',
    description: 'Percorra os parques mais bonitos de Curitiba nesta meia maratona que celebra a qualidade de vida da capital paranaense.',
    totalSpots: 10000,
    registeredCount: 7890,
    price: 160.00,
    isFeatured: true,
    status: 'open',
    organizer: {
      id: '4',
      name: 'Curitiba Running',
      logo: 'https://via.placeholder.com/100',
    },
    categories: [
      { id: '1', name: '21K', distance: '21.097 km', price: 160.00, spotsLeft: 1500 },
      { id: '2', name: '10K', distance: '10 km', price: 100.00, spotsLeft: 2000 },
      { id: '3', name: '5K', distance: '5 km', price: 70.00, spotsLeft: 3000 },
    ],
    kits: [
      { id: '1', name: 'Kit Básico', description: 'Camiseta + Número + Chip', price: 0, included: true },
      { id: '2', name: 'Kit Premium', description: 'Camiseta + Número + Chip + Medalha especial + Sacola', price: 60.00, included: false },
    ],
    route: {
      startPoint: { lat: -25.4195, lng: -49.3189 },
      endPoint: { lat: -25.4195, lng: -49.3189 },
      distance: '21.097 km',
      elevation: '150m',
    },
    gallery: [
      'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=400',
      'https://images.unsplash.com/photo-1486218119243-13883505764c?w=400',
    ],
  },
  {
    id: '5',
    title: 'Corrida do Bem - Edição Solidária',
    subtitle: 'Corra por uma causa',
    date: '2025-02-28',
    time: '08:00',
    location: 'Parque Ibirapuera, São Paulo - SP',
    city: 'São Paulo',
    state: 'SP',
    image: 'https://images.unsplash.com/photo-1486218119243-13883505764c?w=800',
    bannerImage: 'https://images.unsplash.com/photo-1486218119243-13883505764c?w=1200',
    description: 'Uma corrida beneficente onde parte da arrecadação é destinada a instituições de caridade. Venha fazer a diferença!',
    totalSpots: 5000,
    registeredCount: 4123,
    price: 80.00,
    isFeatured: false,
    status: 'open',
    organizer: {
      id: '5',
      name: 'ONG Correndo pelo Bem',
      logo: 'https://via.placeholder.com/100',
    },
    categories: [
      { id: '1', name: '5K Solidário', distance: '5 km', price: 80.00, spotsLeft: 500 },
      { id: '2', name: '3K Família', distance: '3 km', price: 50.00, spotsLeft: 800 },
    ],
    kits: [
      { id: '1', name: 'Kit Solidário', description: 'Camiseta exclusiva + Número + Medalha', price: 0, included: true },
    ],
    route: {
      startPoint: { lat: -23.5874, lng: -46.6576 },
      endPoint: { lat: -23.5874, lng: -46.6576 },
      distance: '5 km',
      elevation: '30m',
    },
    gallery: [],
  },
  {
    id: '6',
    title: 'Desafio 12 Horas de Corrida',
    subtitle: 'Quanto você consegue correr?',
    date: '2025-07-19',
    time: '06:00',
    location: 'Autódromo de Interlagos, São Paulo - SP',
    city: 'São Paulo',
    state: 'SP',
    image: 'https://images.unsplash.com/photo-1461896836934- voices-of-the-city?w=800',
    bannerImage: 'https://images.unsplash.com/photo-1461896836934-fffceb2982a4?w=1200',
    description: 'Um desafio de resistência onde você corre o máximo que conseguir em 12 horas. Individual ou em revezamento.',
    totalSpots: 2000,
    registeredCount: 1456,
    price: 200.00,
    isFeatured: false,
    status: 'open',
    organizer: {
      id: '6',
      name: 'Ultra Running Brasil',
      logo: 'https://via.placeholder.com/100',
    },
    categories: [
      { id: '1', name: 'Individual', distance: 'Livre', price: 200.00, spotsLeft: 300 },
      { id: '2', name: 'Dupla', distance: 'Livre', price: 350.00, spotsLeft: 150 },
      { id: '3', name: 'Quarteto', distance: 'Livre', price: 600.00, spotsLeft: 100 },
    ],
    kits: [
      { id: '1', name: 'Kit Ultra', description: 'Camiseta técnica + Número + Chip + Mochila + Alimentação', price: 0, included: true },
    ],
    route: {
      startPoint: { lat: -23.7036, lng: -46.6975 },
      endPoint: { lat: -23.7036, lng: -46.6975 },
      distance: 'Circuito 2.5km',
      elevation: '50m',
    },
    gallery: [],
  },
];

export const mockRegistrations = [
  {
    id: '1',
    eventId: '1',
    event: mockEvents[0],
    categoryId: '2',
    categoryName: '21K - Meia Maratona',
    kitId: '2',
    kitName: 'Kit Premium',
    status: 'confirmed',
    paymentStatus: 'paid',
    registrationDate: '2025-01-10',
    totalPrice: 330.00,
    bibNumber: '2547',
    checkInDone: false,
  },
  {
    id: '2',
    eventId: '2',
    event: mockEvents[1],
    categoryId: '1',
    categoryName: '10K',
    kitId: '1',
    kitName: 'Kit Padrão',
    status: 'confirmed',
    paymentStatus: 'paid',
    registrationDate: '2025-01-05',
    totalPrice: 120.00,
    bibNumber: '1234',
    checkInDone: false,
  },
  {
    id: '3',
    eventId: '4',
    event: mockEvents[3],
    categoryId: '1',
    categoryName: '21K',
    kitId: '1',
    kitName: 'Kit Básico',
    status: 'pending',
    paymentStatus: 'pending',
    registrationDate: '2025-01-12',
    totalPrice: 160.00,
    bibNumber: null,
    checkInDone: false,
  },
];

export const mockResults = [
  {
    id: '1',
    eventId: '10',
    eventName: 'Maratona de São Paulo 2024',
    eventDate: '2024-04-07',
    categoryName: '21K - Meia Maratona',
    position: 156,
    totalParticipants: 8500,
    time: '01:45:32',
    pace: '5:01/km',
    distance: '21.097 km',
    certificate: 'https://example.com/certificado-1.pdf',
  },
  {
    id: '2',
    eventId: '11',
    eventName: 'Corrida Noturna Rio 2024',
    eventDate: '2024-03-16',
    categoryName: '10K',
    position: 45,
    totalParticipants: 3200,
    time: '00:48:15',
    pace: '4:49/km',
    distance: '10 km',
    certificate: 'https://example.com/certificado-2.pdf',
  },
  {
    id: '3',
    eventId: '12',
    eventName: 'Meia Maratona de Curitiba 2024',
    eventDate: '2024-06-23',
    categoryName: '21K',
    position: 89,
    totalParticipants: 5600,
    time: '01:52:18',
    pace: '5:20/km',
    distance: '21.097 km',
    certificate: 'https://example.com/certificado-3.pdf',
  },
  {
    id: '4',
    eventId: '13',
    eventName: 'Corrida do Bem 2024',
    eventDate: '2024-02-25',
    categoryName: '5K Solidário',
    position: 12,
    totalParticipants: 2800,
    time: '00:22:45',
    pace: '4:33/km',
    distance: '5 km',
    certificate: 'https://example.com/certificado-4.pdf',
  },
  {
    id: '5',
    eventId: '14',
    eventName: 'Trail Run Mantiqueira 2024',
    eventDate: '2024-05-11',
    categoryName: '21K Trail',
    position: 23,
    totalParticipants: 450,
    time: '02:35:42',
    pace: '7:24/km',
    distance: '21 km',
    certificate: 'https://example.com/certificado-5.pdf',
  },
];

export const mockCertificates = mockResults.map(result => ({
  id: result.id,
  eventName: result.eventName,
  eventDate: result.eventDate,
  categoryName: result.categoryName,
  position: result.position,
  time: result.time,
  downloadUrl: result.certificate,
}));

export const mockTeams = [
  {
    id: '1',
    name: 'Corredores SP',
    logo: 'https://via.placeholder.com/100',
    adminId: '1',
    memberCount: 12,
    role: 'admin' as const,
    createdAt: '2024-06-15',
  },
  {
    id: '2',
    name: 'Running Friends',
    logo: 'https://via.placeholder.com/100',
    adminId: '2',
    memberCount: 8,
    role: 'member' as const,
    createdAt: '2024-08-20',
  },
];

export const mockTeamMembers = [
  {
    id: '1',
    name: 'João Silva',
    email: 'joao.silva@email.com',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    role: 'admin',
    joinedAt: '2024-06-15',
  },
  {
    id: '2',
    name: 'Maria Santos',
    email: 'maria.santos@email.com',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    role: 'member',
    joinedAt: '2024-06-20',
  },
  {
    id: '3',
    name: 'Pedro Oliveira',
    email: 'pedro.oliveira@email.com',
    avatar: 'https://randomuser.me/api/portraits/men/45.jpg',
    role: 'member',
    joinedAt: '2024-07-01',
  },
  {
    id: '4',
    name: 'Ana Costa',
    email: 'ana.costa@email.com',
    avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
    role: 'member',
    joinedAt: '2024-07-15',
  },
];

// Dados do organizador
export const mockOrganizerStats = {
  totalEvents: 12,
  activeEvents: 3,
  totalRegistrations: 4567,
  totalRevenue: 125890.00,
  pendingPayments: 23,
};

export const mockOrganizerEvents = mockEvents.slice(0, 4).map(event => ({
  ...event,
  registrations: Math.floor(Math.random() * 1000) + 500,
  revenue: Math.floor(Math.random() * 50000) + 10000,
  pendingPayments: Math.floor(Math.random() * 20),
}));


export const mockRecentActivity = [
  {
    id: '1',
    icon: 'person-add',
    text: 'Nova inscrição: Maria Santos - Maratona SP',
    time: 'Há 5 minutos',
    color: '#22C55E',
  },
  {
    id: '2',
    icon: 'card',
    text: 'Pagamento confirmado: João Oliveira',
    time: 'Há 15 minutos',
    color: '#3B82F6',
  },
  {
    id: '3',
    icon: 'person-add',
    text: 'Nova inscrição: Pedro Costa - Corrida Noturna',
    time: 'Há 1 hora',
    color: '#22C55E',
  },
  {
    id: '4',
    icon: 'mail',
    text: 'Mensagem recebida: Dúvida sobre kit',
    time: 'Há 2 horas',
    color: '#F59E0B',
  },
  {
    id: '5',
    icon: 'checkmark-circle',
    text: 'Check-in realizado: Ana Lima',
    time: 'Há 3 horas',
    color: '#8B5CF6',
  },
];


// ============================================
// MOCKS PARA GRUPOS, TREINOS E FEED
// ============================================

export const MOCK_GROUPS = [
  {
    id: 1,
    name: 'Lobos Corredores da Praia',
    description: 'Grupo de corrida na orla de Camburi. Treinos todas as terças e quintas às 6h. Todos os níveis são bem-vindos!',
    logoUrl: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=200&h=200&fit=crop',
    coverUrl: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&h=400&fit=crop',
    city: 'Vitória',
    state: 'ES',
    memberCount: 47,
    privacy: 'public',
    groupType: 'running',
    sportTypes: ['Corrida', 'Trail'],
    level: 'all',
    meetingPoint: 'Quiosque 12, Praia de Camburi',
    isPublic: true,
    allowJoinRequests: true,
    requiresApproval: false,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 2,
    name: 'Pedal ES - Ciclismo Capixaba',
    description: 'O maior grupo de ciclismo do Espírito Santo. Pedaladas semanais, eventos e muito mais!',
    logoUrl: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=200&h=200&fit=crop',
    coverUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&h=400&fit=crop',
    city: 'Vila Velha',
    state: 'ES',
    memberCount: 128,
    privacy: 'public',
    groupType: 'cycling',
    sportTypes: ['Ciclismo', 'MTB'],
    level: 'intermediate',
    meetingPoint: 'Praça do Papa',
    isPublic: true,
    allowJoinRequests: true,
    requiresApproval: false,
    createdAt: '2023-06-20T08:00:00Z',
  },
  {
    id: 3,
    name: 'Tri Force ES',
    description: 'Treinamento de triathlon para atletas de todos os níveis. Natação, ciclismo e corrida integrados.',
    logoUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=200&h=200&fit=crop',
    coverUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&h=400&fit=crop',
    city: 'Vitória',
    state: 'ES',
    memberCount: 32,
    privacy: 'private',
    groupType: 'triathlon',
    sportTypes: ['Triathlon', 'Natação', 'Ciclismo', 'Corrida'],
    level: 'advanced',
    meetingPoint: 'Clube Álvares Cabral',
    isPublic: false,
    allowJoinRequests: true,
    requiresApproval: true,
    createdAt: '2024-03-01T07:00:00Z',
  },
  {
    id: 4,
    name: 'Trail Runners Mestre Álvaro',
    description: 'Aventuras nas trilhas do Mestre Álvaro e região. Para quem ama natureza e desafios!',
    logoUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=200&h=200&fit=crop',
    coverUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=400&fit=crop',
    city: 'Serra',
    state: 'ES',
    memberCount: 65,
    privacy: 'public',
    groupType: 'trail',
    sportTypes: ['Trail Running', 'Hiking'],
    level: 'intermediate',
    meetingPoint: 'Estacionamento do Mestre Álvaro',
    isPublic: true,
    allowJoinRequests: true,
    requiresApproval: false,
    createdAt: '2023-11-10T06:00:00Z',
  },
  {
    id: 5,
    name: 'Nadadoras da Curva da Jurema',
    description: 'Grupo feminino de natação em águas abertas. Treinos seguros e acompanhados.',
    logoUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=200&h=200&fit=crop',
    coverUrl: 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=800&h=400&fit=crop',
    city: 'Vitória',
    state: 'ES',
    memberCount: 23,
    privacy: 'public',
    groupType: 'swimming',
    sportTypes: ['Natação', 'Águas Abertas'],
    level: 'all',
    meetingPoint: 'Curva da Jurema',
    isPublic: true,
    allowJoinRequests: true,
    requiresApproval: false,
    createdAt: '2024-02-14T05:30:00Z',
  },
];

// Função para gerar datas futuras
const getFutureDate = (daysFromNow: number, hour: number, minute: number = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

export const MOCK_GROUP_MEMBERS = [
  { id: 1, name: 'João Silva', avatar: 'https://randomuser.me/api/portraits/men/1.jpg', role: 'owner' },
  { id: 2, name: 'Maria Santos', avatar: 'https://randomuser.me/api/portraits/women/2.jpg', role: 'admin' },
  { id: 3, name: 'Pedro Costa', avatar: 'https://randomuser.me/api/portraits/men/3.jpg', role: 'member' },
  { id: 4, name: 'Ana Oliveira', avatar: 'https://randomuser.me/api/portraits/women/4.jpg', role: 'member' },
  { id: 5, name: 'Carlos Mendes', avatar: 'https://randomuser.me/api/portraits/men/5.jpg', role: 'member' },
  { id: 6, name: 'Lucia Ferreira', avatar: 'https://randomuser.me/api/portraits/women/6.jpg', role: 'member' },
  { id: 7, name: 'Roberto Lima', avatar: 'https://randomuser.me/api/portraits/men/7.jpg', role: 'member' },
  { id: 8, name: 'Fernanda Souza', avatar: 'https://randomuser.me/api/portraits/women/8.jpg', role: 'member' },
];

export const MOCK_TRAININGS = [
  {
    id: 1,
    groupId: 1,
    title: 'Corrida Leve - 5km',
    description: 'Treino leve para iniciantes e recuperação. Ritmo conversável.',
    trainingType: 'easy_run',
    scheduledAt: getFutureDate(1, 6, 0),
    durationMinutes: 45,
    meetingPoint: 'Quiosque 12, Praia de Camburi',
    meetingLat: -20.2697,
    meetingLng: -40.2925,
    maxParticipants: 30,
    goingCount: 18,
    maybeCount: 5,
    notGoingCount: 2,
    status: 'scheduled',
    createdBy: MOCK_GROUP_MEMBERS[0],
    group: MOCK_GROUPS[0],
  },
  {
    id: 2,
    groupId: 1,
    title: 'Treino de Velocidade - Tiros',
    description: '8x400m com recuperação de 90s. Aquecimento e volta à calma inclusos.',
    trainingType: 'speed_work',
    scheduledAt: getFutureDate(3, 6, 0),
    durationMinutes: 60,
    meetingPoint: 'Pista de Atletismo UFES',
    meetingLat: -20.2774,
    meetingLng: -40.3044,
    maxParticipants: 20,
    goingCount: 12,
    maybeCount: 3,
    notGoingCount: 1,
    status: 'scheduled',
    createdBy: MOCK_GROUP_MEMBERS[1],
    group: MOCK_GROUPS[0],
  },
  {
    id: 3,
    groupId: 2,
    title: 'Pedal Matinal - 40km',
    description: 'Pedal leve pela orla. Velocidade média 25km/h. Parada para café!',
    trainingType: 'endurance',
    scheduledAt: getFutureDate(2, 6, 30),
    durationMinutes: 120,
    meetingPoint: 'Praça do Papa',
    meetingLat: -20.3155,
    meetingLng: -40.2891,
    maxParticipants: 50,
    goingCount: 34,
    maybeCount: 8,
    notGoingCount: 3,
    status: 'scheduled',
    createdBy: MOCK_GROUP_MEMBERS[2],
    group: MOCK_GROUPS[1],
  },
  {
    id: 4,
    groupId: 4,
    title: 'Trilha Mestre Álvaro - Subida',
    description: 'Subida completa até o pico. Levar 2L de água e lanche. Dificuldade alta.',
    trainingType: 'trail',
    scheduledAt: getFutureDate(5, 5, 30),
    durationMinutes: 180,
    meetingPoint: 'Estacionamento do Mestre Álvaro',
    meetingLat: -20.1833,
    meetingLng: -40.2667,
    maxParticipants: 15,
    goingCount: 11,
    maybeCount: 2,
    notGoingCount: 0,
    status: 'scheduled',
    createdBy: MOCK_GROUP_MEMBERS[3],
    group: MOCK_GROUPS[3],
  },
  {
    id: 5,
    groupId: 5,
    title: 'Natação Águas Abertas - 1500m',
    description: 'Treino de resistência em águas abertas. Boia obrigatória.',
    trainingType: 'swimming',
    scheduledAt: getFutureDate(4, 6, 0),
    durationMinutes: 60,
    meetingPoint: 'Curva da Jurema',
    meetingLat: -20.2981,
    meetingLng: -40.2856,
    maxParticipants: 12,
    goingCount: 8,
    maybeCount: 2,
    notGoingCount: 1,
    status: 'scheduled',
    createdBy: MOCK_GROUP_MEMBERS[4],
    group: MOCK_GROUPS[4],
  },
  {
    id: 6,
    groupId: 3,
    title: 'Brick - Bike + Run',
    description: 'Treino combinado: 30km bike + 5km corrida. Simulação de transição.',
    trainingType: 'brick',
    scheduledAt: getFutureDate(6, 5, 0),
    durationMinutes: 150,
    meetingPoint: 'Clube Álvares Cabral',
    meetingLat: -20.2950,
    meetingLng: -40.2920,
    maxParticipants: 20,
    goingCount: 15,
    maybeCount: 3,
    notGoingCount: 0,
    status: 'scheduled',
    createdBy: MOCK_GROUP_MEMBERS[1],
    group: MOCK_GROUPS[2],
  },
];

export const MOCK_FEED_EVENTS = [
  {
    id: 1,
    name: 'Meia Maratona de Vitória 2026',
    description: 'A maior corrida de rua do Espírito Santo! Percursos de 5km, 10km e 21km.',
    imageUrl: 'https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=800&h=400&fit=crop',
    date: getFutureDate(45, 7, 0),
    location: 'Praça do Papa, Vitória - ES',
    city: 'Vitória',
    state: 'ES',
    sportType: 'running',
    distances: ['5km', '10km', '21km'],
    price: 'R$ 120 - R$ 180',
    participantsCount: 5000,
    interestedCount: 1250,
  },
  {
    id: 2,
    name: 'Desafio Pedra Azul MTB',
    description: 'Competição de mountain bike nas trilhas de Pedra Azul.',
    imageUrl: 'https://images.unsplash.com/photo-1544191696-102dbdaeeaa0?w=800&h=400&fit=crop',
    date: getFutureDate(30, 6, 0),
    location: 'Pedra Azul, Domingos Martins - ES',
    city: 'Domingos Martins',
    state: 'ES',
    sportType: 'cycling',
    distances: ['30km', '60km'],
    price: 'R$ 150 - R$ 200',
    participantsCount: 800,
    interestedCount: 320,
  },
  {
    id: 3,
    name: 'Ironman 70.3 Vitória',
    description: 'Etapa brasileira do circuito mundial Ironman 70.3.',
    imageUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&h=400&fit=crop',
    date: getFutureDate(90, 6, 0),
    location: 'Praia de Camburi, Vitória - ES',
    city: 'Vitória',
    state: 'ES',
    sportType: 'triathlon',
    distances: ['1.9km swim', '90km bike', '21.1km run'],
    price: 'R$ 1.200',
    participantsCount: 2500,
    interestedCount: 890,
  },
];

export const MOCK_POSTS = [
  {
    id: 1,
    groupId: 1,
    authorId: 1,
    author: MOCK_GROUP_MEMBERS[0],
    group: MOCK_GROUPS[0],
    type: 'activity',
    content: 'Treino matinal concluído! 🏃‍♂️ 10km em 52min. Dia perfeito para correr na praia de Camburi. Bora galera!',
    imageUrl: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=600&h=400&fit=crop',
    activityData: {
      type: 'running',
      distance: 10.2,
      duration: 52,
      pace: '5:06/km',
      calories: 680,
    },
    likesCount: 24,
    commentsCount: 8,
    reactions: { like: 15, love: 5, fire: 3, clap: 1, strong: 0 },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    groupId: 2,
    authorId: 2,
    author: MOCK_GROUP_MEMBERS[1],
    group: MOCK_GROUPS[1],
    type: 'photo',
    content: 'Pedal incrível hoje! 60km pela costa capixaba com a galera do Pedal ES. Vista maravilhosa! 🚴‍♀️',
    imageUrl: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=600&h=400&fit=crop',
    likesCount: 45,
    commentsCount: 12,
    reactions: { like: 28, love: 10, fire: 5, clap: 2, strong: 0 },
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    groupId: 1,
    authorId: 3,
    author: MOCK_GROUP_MEMBERS[2],
    group: MOCK_GROUPS[0],
    type: 'announcement',
    content: '📢 ATENÇÃO LOBOS! Treino de amanhã cancelado devido à previsão de chuva forte. Reagendaremos para quinta-feira mesmo horário. Fiquem ligados!',
    isPinned: true,
    likesCount: 8,
    commentsCount: 15,
    reactions: { like: 8, love: 0, fire: 0, clap: 0, strong: 0 },
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 4,
    groupId: 4,
    authorId: 4,
    author: MOCK_GROUP_MEMBERS[3],
    group: MOCK_GROUPS[3],
    type: 'activity',
    content: 'Subida do Mestre Álvaro concluída! 💪 Que vista incrível lá de cima. Valeu a pena cada gota de suor!',
    imageUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=600&h=400&fit=crop',
    activityData: {
      type: 'trail',
      distance: 8.5,
      duration: 95,
      elevation: 650,
      calories: 890,
    },
    likesCount: 67,
    commentsCount: 23,
    reactions: { like: 35, love: 18, fire: 10, clap: 2, strong: 2 },
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 5,
    groupId: 3,
    authorId: 2,
    author: MOCK_GROUP_MEMBERS[1],
    group: MOCK_GROUPS[2],
    type: 'poll',
    content: 'Qual horário preferem para o treino de sábado?',
    pollOptions: [
      { id: 1, text: '5h da manhã', votes: 8 },
      { id: 2, text: '6h da manhã', votes: 15 },
      { id: 3, text: '7h da manhã', votes: 5 },
    ],
    pollEndsAt: getFutureDate(2, 23, 59),
    likesCount: 12,
    commentsCount: 6,
    reactions: { like: 12, love: 0, fire: 0, clap: 0, strong: 0 },
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 6,
    groupId: 5,
    authorId: 5,
    author: MOCK_GROUP_MEMBERS[4],
    group: MOCK_GROUPS[4],
    type: 'text',
    content: 'Bom dia meninas! Quem vai no treino de amanhã? Previsão de mar calmo, perfeito para nadar! 🏊‍♀️🌊',
    likesCount: 18,
    commentsCount: 9,
    reactions: { like: 10, love: 6, fire: 1, clap: 1, strong: 0 },
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 7,
    groupId: 1,
    authorId: 1,
    author: MOCK_GROUP_MEMBERS[0],
    group: MOCK_GROUPS[0],
    type: 'achievement',
    content: '🏆 CONQUISTA DESBLOQUEADA! Completei 100 corridas com o grupo Lobos! Obrigado a todos pela parceria!',
    achievementData: {
      type: 'milestone',
      title: '100 Corridas',
      icon: 'trophy',
    },
    likesCount: 89,
    commentsCount: 34,
    reactions: { like: 45, love: 25, fire: 12, clap: 5, strong: 2 },
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
];

// Funções helper para mocks
export const getMyGroups = () => {
  return [MOCK_GROUPS[0], MOCK_GROUPS[3]];
};

export const getUpcomingTrainings = () => {
  return MOCK_TRAININGS.slice(0, 4).map(t => ({
    ...t,
    type: 'training' as const,
  }));
};

export const getUpcomingCommitments = () => {
  const trainings = MOCK_TRAININGS.filter(t => 
    [1, 4].includes(t.groupId)
  ).map(t => ({
    ...t,
    type: 'training' as const,
  }));

  const events = MOCK_FEED_EVENTS.slice(0, 2).map(e => ({
    ...e,
    type: 'event' as const,
    scheduledAt: e.date,
  }));

  return [...trainings, ...events]
    .sort((a, b) => new Date(a.scheduledAt || a.date).getTime() - new Date(b.scheduledAt || b.date).getTime())
    .slice(0, 5);
};

export const getFeedPosts = () => {
  return MOCK_POSTS.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
};

export const formatTrainingDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dayOfMonth = date.getDate();
  const month = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

  if (date.toDateString() === today.toDateString()) {
    return { line1: 'Hoje', line2: `${dayOfMonth} de ${month}` };
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return { line1: 'Amanhã', line2: `${dayOfMonth} de ${month}` };
  }
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  return { line1: weekday, line2: `${dayOfMonth} de ${month}` };
};

export const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

// Usuário atual mockado
export const MOCK_CURRENT_USER = {
  id: 1,
  name: 'João Silva',
  email: 'joao@email.com',
  avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
  city: 'Vitória',
  state: 'ES',
  level: 'intermediate',
  bio: 'Corredor amador apaixonado por esportes ao ar livre.',
  totalActivities: 156,
  totalDistance: 1250.5,
  streak: 12,
  groups: [MOCK_GROUPS[0], MOCK_GROUPS[3]],
};
