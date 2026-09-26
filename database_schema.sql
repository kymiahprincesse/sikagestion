-- ==========================================
-- SIKA GESTION - SCHÉMA DE BASE DE DONNÉES
-- ==========================================
-- Exécutez ce script dans l'éditeur SQL de Supabase (SQL Editor)

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. TABLES

-- Utilisateurs (Gestion interne indépendante de auth.users)
create table if not exists utilisateurs (
    id uuid default uuid_generate_v4() primary key,
    email text unique not null,
    nom text not null,
    role text not null default 'USER',
    is_actif boolean default true,
    last_login timestamp with time zone,
    date_creation timestamp with time zone default now()
);

-- Clients
create table if not exists clients (
    id uuid default uuid_generate_v4() primary key,
    nom text not null,
    raison_sociale text,
    ncc text,
    secteur text,
    adresse text,
    ville text,
    pays text default 'Côte d''Ivoire',
    contact_nom text,
    contact_telephone text,
    contact_email text,
    conditions_paiement integer default 30,
    type text default 'CLIENT',
    is_actif boolean default true,
    notes text,
    date_creation timestamp with time zone default now()
);

-- Fournisseurs
create table if not exists fournisseurs (
    id uuid default uuid_generate_v4() primary key,
    nom text not null,
    contact_nom text,
    contact_email text,
    contact_telephone text,
    type_service text,
    adresse text,
    is_actif boolean default true,
    notes text,
    date_creation timestamp with time zone default now()
);

-- Projets (Pilotage / Planification)
create table if not exists projets (
    id uuid default uuid_generate_v4() primary key,
    nom text not null,
    client_id uuid references clients(id),
    statut text default 'EN_ATTENTE',
    date_debut date,
    date_fin date,
    budget_prevu numeric,
    notes text,
    date_creation timestamp with time zone default now()
);

-- Devis
create table if not exists devis (
    id uuid default uuid_generate_v4() primary key,
    reference text unique not null,
    client_id uuid references clients(id),
    projet_id uuid references projets(id),
    type text not null,
    statut text default 'BROUILLON',
    montant_ht numeric default 0,
    tva numeric default 0,
    montant_ttc numeric default 0,
    date_creation timestamp with time zone default now(),
    date_validite date,
    notes text
);

-- Lignes de devis
create table if not exists lignes_devis (
    id uuid default uuid_generate_v4() primary key,
    devis_id uuid references devis(id) on delete cascade,
    description text not null,
    quantite numeric default 1,
    prix_unitaire numeric not null,
    montant_total numeric not null
);

-- Mouvements Caisse
create table if not exists mouvements_caisse (
    id uuid default uuid_generate_v4() primary key,
    type_mouvement text not null, -- 'ENTREE' ou 'SORTIE'
    montant numeric not null,
    date_mouvement date not null,
    motif text not null,
    reference text,
    utilisateur_id uuid references utilisateurs(id),
    date_creation timestamp with time zone default now()
);

-- Appels d'offres
create table if not exists appels_offres (
    id uuid default uuid_generate_v4() primary key,
    reference text unique not null,
    titre text not null,
    client_id uuid references clients(id),
    statut text default 'NOUVEAU',
    date_limite date,
    budget_estime numeric,
    description text,
    date_creation timestamp with time zone default now()
);

-- Taches (Projets)
create table if not exists taches (
    id uuid default uuid_generate_v4() primary key,
    projet_id uuid references projets(id) on delete cascade,
    nom text not null,
    statut text default 'A_FAIRE',
    date_debut date,
    date_fin date,
    assigne_a uuid references utilisateurs(id),
    date_creation timestamp with time zone default now()
);

-- Audit Logs
create table if not exists audit_logs (
    id uuid default uuid_generate_v4() primary key,
    utilisateur_id uuid references utilisateurs(id),
    action text not null,
    details jsonb,
    date_creation timestamp with time zone default now()
);

-- 3. POLITIQUES DE SÉCURITÉ (RLS)
-- Désactivation pour l'instant afin de garantir que l'application marche
alter table utilisateurs disable row level security;
alter table clients disable row level security;
alter table fournisseurs disable row level security;
alter table projets disable row level security;
alter table devis disable row level security;
alter table lignes_devis disable row level security;
alter table mouvements_caisse disable row level security;
alter table appels_offres disable row level security;
alter table taches disable row level security;
alter table audit_logs disable row level security;

-- Encaissements
create table if not exists encaissements (
    id uuid default uuid_generate_v4() primary key,
    facture_id uuid,
    client_id uuid references clients(id),
    montant numeric not null,
    date_paiement date not null,
    mode_paiement text,
    reference_paiement text,
    notes text,
    date_creation timestamp with time zone default now()
);

-- Ressources Hebdo
create table if not exists ressources_hebdo (
    id uuid default uuid_generate_v4() primary key,
    projet_id uuid references projets(id) on delete cascade,
    semaine text not null,
    type_ressource text not null,
    quantite numeric default 0,
    cout_estime numeric default 0,
    date_creation timestamp with time zone default now()
);

alter table encaissements disable row level security;
alter table ressources_hebdo disable row level security;

