We are making a WYSIWYG document layout tool for tabletop wargame reference sheets.

The project uses typescript, html and css flexbox to let the user divide up the screen. 

The main view is of a A4 or Letter page. 



## Layout mode
### A toolbar at the top has a number of options:
* change page dimensions (a4/letter and portrait/landscape)
* add margin to the page
* toggle between edit modes (layout, styling, content, preview)

### other functionality
* the user can edit flex box container parameters
* Content in containers uses overflow: hidden while in this view so it will not push the layout.
* flexbox container with less than 1 px of margin and padding gain 1px of margin and padding
* flex box containers gain green borders of 1px to show where they are.
* The user can select a flexbox container and change its flexbox css properties. The controls for this appear in a sidebar, grouped by flexbox container and flexbox item properties.
* The user can save the settings as a css class
* the selected containers class is shown in the sidebar if it has one
* editing a property of a container that has a class name changes the property for the class
* css containers can only have one class, and its class can only container css properties relating to flexbox layout.

## Content mode
* content eligible flexbox containers are those that do not contain flexbox containers
* non-elibile flexbox containers return to their normal padding/margin/border properies.
* eligible flexbox containers that do not contain flexbox containers are highlighted with the 1px green border and 2px margin.
* the user can select any elegible flexbox containers
* the user can right click an eligible container to add a content element from a right click menu
* the user can right click a content element to delete it from a right click menu


## Styling mode
* each content element can be selected.
* in the sidebar, a list of the css classes that the content element has appears.
* the bottom item of the list is a text field where the user can type a new class, adding it with the enter key
* each listed class has a delete (x) button after it so the user can delete it
* under the list are text fields so the user can edit each of the css classes that the selected content element has.

## Preview mode
* Nothing is selected
* The user cannot click on anything
* The document is shown as it will be when printed.