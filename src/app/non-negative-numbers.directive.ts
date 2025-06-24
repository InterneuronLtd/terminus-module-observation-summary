//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2025  Interneuron Limited

//This program is free software: you can redistribute it and/or modify
//it under the terms of the GNU General Public License as published by
//the Free Software Foundation, either version 3 of the License, or
//(at your option) any later version.

//This program is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

//See the
//GNU General Public License for more details.

//You should have received a copy of the GNU General Public License
//along with this program.If not, see<http://www.gnu.org/licenses/>.
//END LICENSE BLOCK 
/* Interneuron Observation App
Copyright(C) 2023  Interneuron Holdings Ltd
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
See the
GNU General Public License for more details.
You should have received a copy of the GNU General Public License
along with this program.If not, see<http://www.gnu.org/licenses/>. */

import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[positiveNumbersOnly]'
})
export class NonNegativeNumbersDirective {

  constructor(private _el: ElementRef) {
  }

  @HostListener('blur', ['$event'])
  @HostListener('change', ['$event'])
  @HostListener('keydown', ['$event']) onKeyDown(event) {
    //console.log(event);
    //  avoid desimal dot button ,minus button
    if (event.keyCode)
      if (event.keyCode == 109 || event.keyCode == 189 || event.keyCode == 69) {
        //console.log(event.keyCode);
        event.stopPropagation();
        return false;
      }

    const initalValue = this._el.nativeElement.value;
    if(initalValue.indexOf('-')!=-1)
    {
      this._el.nativeElement.value = "";
      event.stopPropagation();
    }
    // const initalValue = this._el.nativeElement.value;
    // this._el.nativeElement.value = initalValue.replace(/-/g, '');
    // if (initalValue !== this._el.nativeElement.value) {
    //   this._el.nativeElement.value = "";
    //   event.stopPropagation();
    // }

  }

}
