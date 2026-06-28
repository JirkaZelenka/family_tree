# Family Tree Visualizer

An interactive web application for visualizing family trees with advanced features.

## Features

Goals:
- Nice visualization of Family tree, vertically scrollable, zoomable, with the year that is currently scrolled to in the corner.
- it should be probably combination of Python and D3.js
- Easy add/edit persons + check on consistency/duplicities based on name, birth date
- data stored probably as JSOns with some connections, like DAG
- export/import of data (family trees) that can be not connecte dto each other - even if yes, they can be connected but still individually selected from more trees in the top level menu.
- option to upload another JSON with other family, as a separate tree, where it can try to find intersections, evaluate % of match
- sidebar with people of the family who could met in the given period (half-centuries?) that is displayed
- color change of the background for each 25/50 years
- highlighted main tree branch (the one that is longest), but also option to click someone to highlight their ancestors.
- sidebar with legend, colors of main families, checkboxes, option to jump to top/bottom of that family
- clicking on person = detailed card, notes, photos, contact
- question marks for unclear names or dates, very unclear persons being blured with some more quetsionmarks
- option to add some important world/local events as a side timeline, which can also be displayed/hidden
- birthday warning, especially multiples of 5. Option to display/hide one-year timeline with all birthdays placed and age of persons that will be this year

FIX:
- ugly visual
- DONE: click by neměl být zoom out all
- DONE: click na kartu spustí bohužel blikačku
- DONE: barvičky
- rodné jméno u každého, psát do závorky
- ugly family vazby, rozbití manželé - neumí to vyrobit ten parametr FamilyName co si přeju...
- lepší interkativita
- chci zobrazovat více rodů..checboxy
- family name - na zobrazení rodů a barviček
- ta práce s obdobími a současníky

## Setup Instructions

1. **Install Python dependencies:**
    
   ```bash
   python -m venv venv
   C:\Users\....\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

2. **Run the application:**
   ```bash
   python app.py
   ```

3. **Open your browser:**
   Navigate to `http://localhost:5000`

## Sharing Your App with Pinggy.io

To allow others to access your locally running app:

1. **Start your Flask app first** (in one terminal):
   ```bash
   python app.py
   ```

2. **Start the tunnel** (in a separate terminal):
   ```bash
   ssh -p 443 -R0:localhost:5000 a.pinggy.io
   ```
   
   Or use the helper script:
   ```bash
   tunnel.bat
   ```

3. **Important Notes:**
   - The SSH connection **must stay open** for the tunnel to work
   - When you connect, pinggy.io will display a URL like `https://randomstring.a.pinggy.online`
   - Copy that URL and share it with others
   - Keep both terminals open (one for Flask, one for SSH tunnel)
   - Press `Ctrl+C` in the tunnel terminal to stop sharing

4. **Troubleshooting:**
   - If the connection closes immediately, make sure your Flask app is running on port 5000
   - If the tunnel URL shows nothing, verify your local app works at `http://localhost:5000`
   - The tunnel only works while the SSH session is active