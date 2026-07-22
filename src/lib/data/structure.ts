export interface UniversityStructure {
  acronym:  string;              // must match universities.json
  colleges: CollegeEntry[];
}

export interface CollegeEntry {
  name:        string;
  departments: string[];
}