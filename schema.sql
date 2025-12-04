-- schema.sql
-- Beispiel-Hierarchie basierend auf der US Army

DROP TABLE IF EXISTS units CASCADE;

CREATE TABLE units (
    id        SERIAL PRIMARY KEY,
    name      TEXT NOT NULL,
    abbrev    TEXT,
    unit_type TEXT NOT NULL,
    parent_id INTEGER REFERENCES units(id) ON DELETE CASCADE
);

-- Root
INSERT INTO units (name, abbrev, unit_type, parent_id) VALUES
('United States Army', 'USA', 'Army', NULL);

-- Army Commands (unterstellt der Army)
INSERT INTO units (name, abbrev, unit_type, parent_id) VALUES
('United States Army Forces Command', 'FORSCOM', 'Army Command', 1),
('United States Army Training and Doctrine Command', 'TRADOC', 'Army Command', 1),
('United States Army Materiel Command', 'AMC', 'Army Command', 1);

-- Field Army / Theater Commands (unter FORSCOM)
INSERT INTO units (name, abbrev, unit_type, parent_id) VALUES
('United States Army Europe and Africa', 'USAREUR-AF', 'Field Army', 2),
('United States Army Pacific', 'USARPAC', 'Field Army', 2);

-- Corps (unter FORSCOM)
INSERT INTO units (name, abbrev, unit_type, parent_id) VALUES
('XVIII Airborne Corps', 'XVIII Corps', 'Corps', 2),
('III Armored Corps', 'III Corps', 'Corps', 2);

-- Divisions (unter Corps)
INSERT INTO units (name, abbrev, unit_type, parent_id) VALUES
('82nd Airborne Division', '82nd ABN DIV', 'Division', 6),
('101st Airborne Division (Air Assault)', '101st ABN DIV', 'Division', 6),
('1st Cavalry Division', '1st CAV DIV', 'Division', 7),
('1st Armored Division', '1st AD', 'Division', 7);

-- Brigades (unter Divisions)
INSERT INTO units (name, abbrev, unit_type, parent_id) VALUES
('1st Brigade Combat Team, 82nd Airborne Division', '1st BCT, 82nd', 'Brigade', 8),
('2nd Brigade Combat Team, 82nd Airborne Division', '2nd BCT, 82nd', 'Brigade', 8),
('3rd Brigade Combat Team, 1st Cavalry Division', '3rd BCT, 1st CAV', 'Brigade', 10),
('1st Armored Brigade Combat Team, 1st Armored Division', '1st ABCT, 1st AD', 'Brigade', 11);

-- Battalions (unter Brigades)
INSERT INTO units (name, abbrev, unit_type, parent_id) VALUES
('1st Battalion, 504th Parachute Infantry Regiment', '1-504 PIR', 'Battalion', 13),
('2nd Battalion, 504th Parachute Infantry Regiment', '2-504 PIR', 'Battalion', 13),
('1st Squadron, 7th Cavalry Regiment', '1-7 CAV', 'Battalion', 15),
('1st Battalion, 36th Infantry Regiment', '1-36 INF', 'Battalion', 16);
