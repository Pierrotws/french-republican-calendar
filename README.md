# French Republican Calendar

This is a maintained fork of original work from @jcdubacq.
It works with GNOME 45+.

<img align="right" src="french-republican-calendar@pierrotws.github.com/icon.png?raw=true" alt="French Revolutionary Calendar" />
This utility displays the current date of the [French Republican Calendar](http://en.wikipedia.org/wiki/French_Republican_Calendar) in the top panel using the [equinox rule](http://en.wikipedia.org/wiki/French_Republican_Calendar#Converting_from_the_Gregorian_Calendar).

It also displays (when clicked) details such as the name of the day and the aspect celebrated this day (often a plant or an instrument of labor).

![Version 8 in action](french-republican-calendar@pierrotws.github.com/screenshot.png?raw=true "Version 8 in action")


## Evolution of the extension :

1. Integration with the real `datetime` box would be really great, but it may involve a lot of code redundancy (fragile) with the original code. The date would appear in the `datetime` button, and the extended info in the date and time panel (below the calendar).
2. The astronomical computations routines come from [fourmilab](https://www.fourmilab.ch/documents/calendar/). There are plenty of other fun calendars there. The date could be also displayed in Hebrew, Mayan, Islamic or Persion version! So cool... (ongoing ; hebrew and islamic calendars already in).
3. Additional Calendar widget has been introduced.
