-- Adiciona novos segmentos econômicos especializados ao cadastro de clientes
INSERT INTO client_segments (name, category, is_active, sort_order)
VALUES
('Academias e Esportes', 'Segmentos', true, 15),
('Automotivo', 'Segmentos', true, 25),
('E-commerce', 'Segmentos', true, 75),
('Facilities e Terceirização', 'Segmentos', true, 105),
('Farmácias e Drogarias', 'Segmentos', true, 107),
('Gráfica e Comunicação Visual', 'Segmentos', true, 115),
('Mercado Digital e Infoprodutos', 'Segmentos', true, 185),
('Pet e Veterinária', 'Segmentos', true, 205),
('Telecomunicações e Provedores', 'Segmentos', true, 305)
ON CONFLICT (name) DO NOTHING;
