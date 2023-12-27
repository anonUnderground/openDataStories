# openDataStories

## Table of Contents
- [Project Description](#project-description)
- [Installation on local](#installation-on-local)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Project Description
Project to explore JavaScript animations for open-source public data from governmental open data initiatives. This project utilizes Three.js for 3D animations and Webpack for module bundling.

## Installation on local
Describe the steps to install your project. For example:
1. Clone the repository:

git clone https://github.com/your-username/openDataStories.git

2. Navigate to the project directory:

cd openDataStories

3. Install dependencies:

npm install

## Usage

### To run the application locally:

1. Open your chosen terminal and navigate to the project's root directory

'''cd path/to/openDataStories''''

2. Initialize NPM (if not already done):

'''npm init -y'''

3. Build the project:

If you want the package to handle install for you,

'''npm run build'''

If you want to install the necassary packages yourself:

'''npm install three'''

'''npm install webpack webpack-cli --save-dev'''

4. Navigate to the `dist` directory (make sure you do this or localhost will not work as expected):

'''cd dist'''

5. Run Webpack to bundle your JavaScript:

'''npx webpack'''

6. Install http-server (a simple, zero-configuration command-line HTTP server):

'''npm install http-server -g'''

7. Start a local server (e.g., using http-server):

'''http-server'''

8. Open `http://localhost:8080` in a web browser to view the application.


## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License - see the LICENSE.md file for details.

## Acknowledgments