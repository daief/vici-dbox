/// <reference types="@vicinae/api">

/*
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 */

type ExtensionPreferences = {
  /** Code directory - Code directory */
	"codeDir": string;
}

declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Command: All-in-One */
	export type Dbox = ExtensionPreferences & {
		
	}
}

declare namespace Arguments {
  /** Command: All-in-One */
	export type Dbox = {
		
	}
}