package com.memoriser.vocabulary.domain;

import io.micronaut.serde.annotation.Serdeable;
import java.util.List;

@Serdeable
public class Meaning {
    private String partOfSpeech;
    private List<Definition> definitions;
    private List<String> synonyms;
    private List<String> antonyms;

    public Meaning() {}

    public String getPartOfSpeech() { return partOfSpeech; }
    public void setPartOfSpeech(String partOfSpeech) { this.partOfSpeech = partOfSpeech; }
    
    public List<Definition> getDefinitions() { return definitions; }
    public void setDefinitions(List<Definition> definitions) { this.definitions = definitions; }

    public List<String> getSynonyms() { return synonyms; }
    public void setSynonyms(List<String> synonyms) { this.synonyms = synonyms; }

    public List<String> getAntonyms() { return antonyms; }
    public void setAntonyms(List<String> antonyms) { this.antonyms = antonyms; }

    @Serdeable
    public static class Definition {
        private String definition;
        private String example;

        public Definition() {}

        public String getDefinition() { return definition; }
        public void setDefinition(String definition) { this.definition = definition; }

        public String getExample() { return example; }
        public void setExample(String example) { this.example = example; }
    }
}
