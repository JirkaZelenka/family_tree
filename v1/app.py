from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
from datetime import datetime
from pathlib import Path

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

DATA_DIR = Path('data')
DATA_DIR.mkdir(exist_ok=True)

def load_trees():
    """Load all family trees from data directory"""
    trees = {}
    for file in DATA_DIR.glob('*.json'):
        tree_id = file.stem
        with open(file, 'r', encoding='utf-8') as f:
            trees[tree_id] = json.load(f)
    return trees

def save_tree(tree_id, data):
    """Save a family tree to JSON file"""
    file_path = DATA_DIR / f"{tree_id}.json"
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def check_duplicates(persons, new_person):
    """Check for potential duplicates based on name and birth date"""
    duplicates = []
    new_name = new_person.get('name', '').lower().strip()
    new_birth = new_person.get('birthDate')
    
    for person in persons:
        if person.get('id') == new_person.get('id'):
            continue
        person_name = person.get('name', '').lower().strip()
        person_birth = person.get('birthDate')
        
        # Check name similarity
        if new_name and person_name:
            if new_name == person_name or new_name in person_name or person_name in new_name:
                if new_birth == person_birth:
                    duplicates.append({
                        'id': person.get('id'),
                        'name': person.get('name'),
                        'birthDate': person_birth,
                        'match': 'name_and_date'
                    })
                else:
                    duplicates.append({
                        'id': person.get('id'),
                        'name': person.get('name'),
                        'birthDate': person_birth,
                        'match': 'name_only'
                    })
    
    return duplicates

def find_intersections(tree1_persons, tree2_persons):
    """Find potential intersections between two trees"""
    matches = []
    for p1 in tree1_persons:
        for p2 in tree2_persons:
            name1 = p1.get('name', '').lower().strip()
            name2 = p2.get('name', '').lower().strip()
            birth1 = p1.get('birthDate')
            birth2 = p2.get('birthDate')
            
            match_score = 0
            match_reasons = []
            
            if name1 and name2:
                if name1 == name2:
                    match_score += 50
                    match_reasons.append('exact_name')
                elif name1 in name2 or name2 in name1:
                    match_score += 30
                    match_reasons.append('similar_name')
            
            if birth1 and birth2 and birth1 == birth2:
                match_score += 50
                match_reasons.append('same_birth_date')
            
            if match_score > 0:
                matches.append({
                    'tree1_person': p1,
                    'tree2_person': p2,
                    'score': match_score,
                    'reasons': match_reasons
                })
    
    return matches

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/api/trees', methods=['GET'])
def get_trees():
    """Get list of all family trees"""
    trees = load_trees()
    return jsonify({
        'trees': list(trees.keys()),
        'data': trees
    })

@app.route('/api/trees/<tree_id>', methods=['GET'])
def get_tree(tree_id):
    """Get a specific family tree"""
    file_path = DATA_DIR / f"{tree_id}.json"
    if not file_path.exists():
        return jsonify({'error': 'Tree not found'}), 404
    
    with open(file_path, 'r', encoding='utf-8') as f:
        return jsonify(json.load(f))

@app.route('/api/trees/<tree_id>', methods=['POST', 'PUT'])
def save_tree_api(tree_id):
    """Save or update a family tree"""
    data = request.json
    save_tree(tree_id, data)
    return jsonify({'success': True, 'tree_id': tree_id})

@app.route('/api/trees/<tree_id>/persons', methods=['POST'])
def add_person(tree_id):
    """Add a person to a tree"""
    file_path = DATA_DIR / f"{tree_id}.json"
    if not file_path.exists():
        return jsonify({'error': 'Tree not found'}), 404
    
    with open(file_path, 'r', encoding='utf-8') as f:
        tree = json.load(f)
    
    new_person = request.json
    persons = tree.get('persons', [])
    
    # Check for duplicates
    duplicates = check_duplicates(persons, new_person)
    
    # Generate ID if not provided
    if 'id' not in new_person:
        new_person['id'] = f"person_{len(persons) + 1}_{datetime.now().timestamp()}"
    
    persons.append(new_person)
    tree['persons'] = persons
    
    save_tree(tree_id, tree)
    
    return jsonify({
        'success': True,
        'person': new_person,
        'duplicates': duplicates
    })

@app.route('/api/trees/<tree_id>/persons/<person_id>', methods=['PUT'])
def update_person(tree_id, person_id):
    """Update a person in a tree"""
    file_path = DATA_DIR / f"{tree_id}.json"
    if not file_path.exists():
        return jsonify({'error': 'Tree not found'}), 404
    
    with open(file_path, 'r', encoding='utf-8') as f:
        tree = json.load(f)
    
    updated_person = request.json
    persons = tree.get('persons', [])
    
    # Find and update person
    for i, person in enumerate(persons):
        if person.get('id') == person_id:
            updated_person['id'] = person_id
            persons[i] = updated_person
            
            # Check for duplicates
            duplicates = check_duplicates(persons, updated_person)
            
            tree['persons'] = persons
            save_tree(tree_id, tree)
            
            return jsonify({
                'success': True,
                'person': updated_person,
                'duplicates': duplicates
            })
    
    return jsonify({'error': 'Person not found'}), 404

@app.route('/api/trees/<tree_id>/persons/<person_id>', methods=['DELETE'])
def delete_person(tree_id, person_id):
    """Delete a person from a tree"""
    file_path = DATA_DIR / f"{tree_id}.json"
    if not file_path.exists():
        return jsonify({'error': 'Tree not found'}), 404
    
    with open(file_path, 'r', encoding='utf-8') as f:
        tree = json.load(f)
    
    persons = tree.get('persons', [])
    persons = [p for p in persons if p.get('id') != person_id]
    tree['persons'] = persons
    
    save_tree(tree_id, tree)
    return jsonify({'success': True})

@app.route('/api/trees/upload', methods=['POST'])
def upload_tree():
    """Upload a new tree and find intersections"""
    uploaded_data = request.json
    tree_id = uploaded_data.get('tree_id', f"tree_{datetime.now().timestamp()}")
    
    # Save uploaded tree
    save_tree(tree_id, uploaded_data)
    
    # Find intersections with existing trees
    trees = load_trees()
    intersections = {}
    
    for existing_tree_id, existing_tree in trees.items():
        if existing_tree_id == tree_id:
            continue
        
        matches = find_intersections(
            uploaded_data.get('persons', []),
            existing_tree.get('persons', [])
        )
        
        if matches:
            intersections[existing_tree_id] = matches
    
    return jsonify({
        'success': True,
        'tree_id': tree_id,
        'intersections': intersections
    })

@app.route('/api/trees/<tree_id>/export', methods=['GET'])
def export_tree(tree_id):
    """Export a tree as JSON"""
    file_path = DATA_DIR / f"{tree_id}.json"
    if not file_path.exists():
        return jsonify({'error': 'Tree not found'}), 404
    
    with open(file_path, 'r', encoding='utf-8') as f:
        return jsonify(json.load(f))

if __name__ == '__main__':
    # Create sample data if no trees exist
    if not list(DATA_DIR.glob('*.json')):
        # Simple family tree structure:
        # - 2 siblings (children)
        # - 2 parents (each with 1 sibling)
        # - 4 grandparents (each with 1-4 siblings)
        
        # Generation 0: Grandparents (4 individual grandparents, each with siblings)
        # Father's father (Grandfather 1) - has 3 siblings
        g1_m = {'id': 'g1_m', 'name': 'Robert Brown', 'birthDate': '1940-01-15', 'deathDate': None, 'gender': 'male', 'parents': [], 'spouses': ['g1_f'], 'notes': 'Father\'s father', 'uncertain': False}
        g1_f = {'id': 'g1_f', 'name': 'Mary Brown', 'birthDate': '1942-03-20', 'deathDate': None, 'gender': 'female', 'parents': [], 'spouses': ['g1_m'], 'notes': 'Father\'s mother', 'uncertain': False}
        g1_s1 = {'id': 'g1_s1', 'name': 'John Brown', 'birthDate': '1938-05-10', 'deathDate': None, 'gender': 'male', 'parents': [], 'spouses': [], 'notes': 'Grandfather 1\'s brother', 'uncertain': False}
        g1_s2 = {'id': 'g1_s2', 'name': 'Alice Brown', 'birthDate': '1944-07-25', 'deathDate': None, 'gender': 'female', 'parents': [], 'spouses': [], 'notes': 'Grandfather 1\'s sister', 'uncertain': False}
        g1_s3 = {'id': 'g1_s3', 'name': 'Tom Brown', 'birthDate': '1946-09-12', 'deathDate': None, 'gender': 'male', 'parents': [], 'spouses': [], 'notes': 'Grandfather 1\'s brother', 'uncertain': False}
        
        # Father's mother (Grandmother 1) - has 1 sibling
        g1_f_s1 = {'id': 'g1_f_s1', 'name': 'Emma Brown', 'birthDate': '1940-08-30', 'deathDate': None, 'gender': 'female', 'parents': [], 'spouses': [], 'notes': 'Grandmother 1\'s sister', 'uncertain': False}
        
        # Mother's father (Grandfather 2) - has 4 siblings
        g2_m = {'id': 'g2_m', 'name': 'David Green', 'birthDate': '1941-02-18', 'deathDate': None, 'gender': 'male', 'parents': [], 'spouses': ['g2_f'], 'notes': 'Mother\'s father', 'uncertain': False}
        g2_f = {'id': 'g2_f', 'name': 'Sarah Green', 'birthDate': '1943-04-22', 'deathDate': None, 'gender': 'female', 'parents': [], 'spouses': ['g2_m'], 'notes': 'Mother\'s mother', 'uncertain': False}
        g2_s1 = {'id': 'g2_s1', 'name': 'Peter Green', 'birthDate': '1939-06-30', 'deathDate': None, 'gender': 'male', 'parents': [], 'spouses': [], 'notes': 'Grandfather 2\'s brother', 'uncertain': False}
        g2_s2 = {'id': 'g2_s2', 'name': 'Anna Green', 'birthDate': '1942-01-08', 'deathDate': None, 'gender': 'female', 'parents': [], 'spouses': [], 'notes': 'Grandfather 2\'s sister', 'uncertain': False}
        g2_s3 = {'id': 'g2_s3', 'name': 'Mark Green', 'birthDate': '1944-03-14', 'deathDate': None, 'gender': 'male', 'parents': [], 'spouses': [], 'notes': 'Grandfather 2\'s brother', 'uncertain': False}
        g2_s4 = {'id': 'g2_s4', 'name': 'Lucy Green', 'birthDate': '1946-05-28', 'deathDate': None, 'gender': 'female', 'parents': [], 'spouses': [], 'notes': 'Grandfather 2\'s sister', 'uncertain': False}
        
        # Mother's mother (Grandmother 2) - has 2 siblings
        g2_f_s1 = {'id': 'g2_f_s1', 'name': 'Richard Green', 'birthDate': '1941-11-03', 'deathDate': None, 'gender': 'male', 'parents': [], 'spouses': [], 'notes': 'Grandmother 2\'s brother', 'uncertain': False}
        g2_f_s2 = {'id': 'g2_f_s2', 'name': 'Susan Green', 'birthDate': '1945-12-07', 'deathDate': None, 'gender': 'female', 'parents': [], 'spouses': [], 'notes': 'Grandmother 2\'s sister', 'uncertain': False}
        
        # Generation 1: Parents (father and mother, each with 1 sibling)
        # Father - has 1 sibling
        p1_m = {'id': 'p1_m', 'name': 'Daniel Brown', 'birthDate': '1970-06-15', 'deathDate': None, 'gender': 'male', 'parents': ['g1_m', 'g1_f'], 'spouses': ['p1_f'], 'notes': 'Father', 'uncertain': False}
        p1_f = {'id': 'p1_f', 'name': 'Jennifer Green', 'birthDate': '1972-08-22', 'deathDate': None, 'gender': 'female', 'parents': ['g2_m', 'g2_f'], 'spouses': ['p1_m'], 'notes': 'Mother', 'uncertain': False}
        p1_s1 = {'id': 'p1_s1', 'name': 'Chris Brown', 'birthDate': '1968-04-10', 'deathDate': None, 'gender': 'male', 'parents': ['g1_m', 'g1_f'], 'spouses': [], 'notes': 'Father\'s brother', 'uncertain': False}
        
        # Mother - has 1 sibling
        p1_f_s1 = {'id': 'p1_f_s1', 'name': 'Karen Green', 'birthDate': '1971-02-28', 'deathDate': None, 'gender': 'female', 'parents': ['g2_m', 'g2_f'], 'spouses': [], 'notes': 'Mother\'s sister', 'uncertain': False}
        
        # Generation 2: Children (2 siblings)
        c1 = {'id': 'c1', 'name': 'Alex Brown', 'birthDate': '2005-03-20', 'deathDate': None, 'gender': 'male', 'parents': ['p1_m', 'p1_f'], 'spouses': [], 'notes': 'Child 1', 'uncertain': False}
        c2 = {'id': 'c2', 'name': 'Sophia Brown', 'birthDate': '2007-05-15', 'deathDate': None, 'gender': 'female', 'parents': ['p1_m', 'p1_f'], 'spouses': [], 'notes': 'Child 2', 'uncertain': False}
        
        sample_tree = {
            'id': 'sample_tree',
            'name': 'Simple Family Tree',
            'events': [
                {'year': 2000, 'event': 'New Millennium', 'type': 'world'},
                {'year': 2020, 'event': 'COVID-19 Pandemic', 'type': 'world'}
            ],
            'persons': [
                # Grandparents and their siblings (4 grandparents, each with 1-4 siblings)
                g1_m, g1_f, g1_s1, g1_s2, g1_s3, g1_f_s1,  # Father's parents: g1_m (3 siblings), g1_f (1 sibling)
                g2_m, g2_f, g2_s1, g2_s2, g2_s3, g2_s4, g2_f_s1, g2_f_s2,  # Mother's parents: g2_m (4 siblings), g2_f (2 siblings)
                # Parents and their siblings (2 parents, each with 1 sibling)
                p1_m, p1_f, p1_s1, p1_f_s1,
                # Children (2 siblings)
                c1, c2
            ]
        }
        save_tree('sample_tree', sample_tree)
        
        # Create additional family tree - Williams family branch
        williams_tree = {
            'id': 'williams_tree',
            'name': 'Williams Family Tree',
            'events': [
                {'year': 1850, 'event': 'California Gold Rush', 'type': 'local'},
                {'year': 1912, 'event': 'Titanic sinks', 'type': 'world'},
                {'year': 1945, 'event': 'End of WWII', 'type': 'world'}
            ],
            'persons': [
                {'id': 'w_gen1_m', 'name': 'Alexander Williams', 'birthDate': '1810-05-10', 'deathDate': '1885-03-20', 'gender': 'male', 'parents': [], 'spouses': ['w_gen1_f'], 'notes': 'Ship captain', 'uncertain': False},
                {'id': 'w_gen1_f', 'name': 'Victoria Williams', 'birthDate': '1812-08-22', 'deathDate': '1890-11-15', 'gender': 'female', 'parents': [], 'spouses': ['w_gen1_m'], 'notes': '', 'uncertain': False},
                {'id': 'w_gen2_m', 'name': 'Frederick Williams', 'birthDate': '1840-12-05', 'deathDate': '1910-07-18', 'gender': 'male', 'parents': ['w_gen1_m', 'w_gen1_f'], 'spouses': ['w_gen2_f'], 'notes': 'Merchant', 'uncertain': False},
                {'id': 'w_gen2_f', 'name': 'Charlotte Williams', 'birthDate': '1842-03-28', 'deathDate': '1915-09-10', 'gender': 'female', 'parents': [], 'spouses': ['w_gen2_m'], 'notes': '', 'uncertain': False},
                {'id': 'w_gen2_brother', 'name': 'Edward Williams', 'birthDate': '1838-06-15', 'deathDate': '1905-04-22', 'gender': 'male', 'parents': ['w_gen1_m', 'w_gen1_f'], 'spouses': [], 'notes': 'Explorer', 'uncertain': False},
                {'id': 'w_gen3_m', 'name': 'Harold Williams', 'birthDate': '1870-09-12', 'deathDate': '1940-02-28', 'gender': 'male', 'parents': ['w_gen2_m', 'w_gen2_f'], 'spouses': ['w_gen3_f'], 'notes': 'Banker', 'uncertain': False},
                {'id': 'w_gen3_f', 'name': 'Dorothy Williams', 'birthDate': '1872-11-20', 'deathDate': '1945-08-05', 'gender': 'female', 'parents': [], 'spouses': ['w_gen3_m'], 'notes': '', 'uncertain': False},
                {'id': 'w_gen4_m', 'name': 'Franklin Williams', 'birthDate': '1900-04-18', 'deathDate': '1975-12-10', 'gender': 'male', 'parents': ['w_gen3_m', 'w_gen3_f'], 'spouses': ['w_gen4_f'], 'notes': 'WWI veteran, businessman', 'uncertain': False},
                {'id': 'w_gen4_f', 'name': 'Helen Williams', 'birthDate': '1902-07-25', 'deathDate': '1980-05-15', 'gender': 'female', 'parents': [], 'spouses': ['w_gen4_m'], 'notes': '', 'uncertain': False},
                {'id': 'w_gen5_m', 'name': 'Richard Williams', 'birthDate': '1928-10-08', 'deathDate': '2010-03-22', 'gender': 'male', 'parents': ['w_gen4_m', 'w_gen4_f'], 'spouses': ['w_gen5_f'], 'notes': 'WWII veteran, professor', 'uncertain': False},
                {'id': 'w_gen5_f', 'name': 'Nancy Williams', 'birthDate': '1930-01-14', 'deathDate': '2015-09-30', 'gender': 'female', 'parents': [], 'spouses': ['w_gen5_m'], 'notes': 'Author', 'uncertain': False},
                {'id': 'w_gen6_m', 'name': 'Daniel Williams', 'birthDate': '1958-06-20', 'deathDate': None, 'gender': 'male', 'parents': ['w_gen5_m', 'w_gen5_f'], 'spouses': ['w_gen6_f'], 'notes': 'Architect', 'uncertain': False},
                {'id': 'w_gen6_f', 'name': 'Jennifer Williams', 'birthDate': '1960-09-12', 'deathDate': None, 'gender': 'female', 'parents': [], 'spouses': ['w_gen6_m'], 'notes': 'Interior designer', 'uncertain': False},
                {'id': 'w_gen7_m', 'name': 'Christopher Williams', 'birthDate': '1988-11-05', 'deathDate': None, 'gender': 'male', 'parents': ['w_gen6_m', 'w_gen6_f'], 'spouses': [], 'notes': 'Photographer', 'uncertain': False}
            ]
        }
        save_tree('williams_tree', williams_tree)
    
    app.run(debug=True, host="0.0.0.0", port=5000)