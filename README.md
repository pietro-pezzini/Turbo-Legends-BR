# Turbo Legends BR

Turbo Legends BR é um add-on para Minecraft Bedrock focado em carros, mecânica modular e progressão técnica.

Construa veículos do zero, evolua motores, gerencie energia e transforme seu mundo em uma oficina de alta performance.

## Visão Geral

Este projeto combina simulação automotiva com sistemas de sobrevivência e produção.
O objetivo é oferecer uma experiência de direção divertida, com identidade brasileira e profundidade de gameplay.

## Principais Recursos

### Veículos

- Ícones brasileiros como Fusca, Uno com escada, Gol e Kombi
- Carros esportivos e hipercarros de alta velocidade
- Veículos utilitários e off-road

### Engenharia Modular

Monte cada carro com componentes independentes:

- Chassi
- Motor (progressão de V3 até V12)
- Rodas
- Bateria

Cada peça impacta diretamente o desempenho final.

### Recursos e Produção

- Extração de látex em árvores customizadas
- Processamento de látex para borracha
- Produção de aço (ferro + carvão)
- Eletrônica baseada em cobre

### Sistema Elétrico

- Cabos para receitas e distribuição de energia
- Eletrólitos para motores
- Níveis de bateria para diferentes demandas

### Sistema de Calor do Motor

- Motores geram calor durante o uso
- O calor pode ser aproveitado como forno móvel
- Motores mais fortes geram mais calor
- Balanceado para não quebrar a progressão

### Oficina

Interface dedicada para:

- Montar carros
- Evoluir componentes
- Pintar veículos

### Customização

- Sistema de pintura avançado
- Upgrades de performance
- Estilos diferentes de montagem

### Mecânicas Especiais

- Fusca: alta durabilidade
- Uno com escada: armazenamento ampliado
- Gol: efeito sonoro especial ao ligar
- Kombi: foco em transporte de passageiros

## Tecnologias

- Minecraft Bedrock Add-on
- Behavior Pack + Resource Pack
- JavaScript (GameTest API)
- JSON para definição de sistemas

## Instalação

1. Baixe a release mais recente do projeto.
2. Importe os pacotes no Minecraft Bedrock.
3. Ative o Behavior Pack no mundo.
4. Ative o Resource Pack no mundo.
5. Habilite os recursos experimentais necessários.

## Roadmap

- Sistema de energia avançado
- Mecânicas de combustível e óleo
- Sistema de trânsito e polícia
- Dano, colisão e física de impacto
- Expansão da frota de veículos

## Sistema de Motores

Os motores são o coração do seu veículo, oferecendo diferentes níveis de progressão:

- **V3**: Motor básico, baixo consumo de energia
- **V5**: Motor balanceado, desempenho médio
- **V8**: Motor rápido, alto desempenho
- **V10**: Motor avançado com núcleo de diamante
- **V12**: Motor supremo com núcleo de netherita

### Receita Base de Motores

Todos os motores seguem este padrão de crafting:

```
Redstone    | Eletrólito | Redstone
Ferro       | Cobre      | Ferro
Redstone    | Eletrólito | Redstone
```

## Sistema de Recursos

### Árvore de Borracha

- Spawna em biomas florestais
- Corte o tronco com espada
- Coleta o látex com balde
- Regeneração em 10 minutos por tronco

### Materiais Principais

- **Aço**: Ferro + Carvão
- **Eletrólito**: Aço + Cobre
- **Cabo**: Borracha + Cobre

## Plano de Desenvolvimento

1. **Fase 1**: Configuração base
2. **Fase 2**: Sistema de recursos (árvore de borracha)
3. **Fase 3**: Materiais (aço, cabos)
4. **Fase 4**: Motores
5. **Fase 5**: Veículos
6. **Fase 6**: Oficina
7. **Fase 7**: Sistema de calor
8. **Fase 8**: Conteúdo de veículos
9. **Fase 9**: Polimento final

## Decisões Importantes

- ✓ Sem nomes de marcas reais (proteção de direitos autorais)
- ✓ Sistema modular para veículos
- ✓ Começar simples e expandir gradualmente
- ✓ Limitações do Bedrock consideradas

## Contribuindo

Contribuições são bem-vindas.

1. Faça um fork do repositório.
2. Crie uma branch para sua feature: `feat/minha-feature`.
3. Commit suas alterações com mensagens claras.
4. Abra um Pull Request descrevendo o que foi alterado.

## Status

Projeto em evolução. Novos sistemas e veículos serão adicionados em etapas.