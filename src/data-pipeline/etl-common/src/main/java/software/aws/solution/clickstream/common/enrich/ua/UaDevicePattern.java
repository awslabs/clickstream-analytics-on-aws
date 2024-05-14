package software.aws.solution.clickstream.common.enrich.ua;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
public class UaDevicePattern {
    private static final Pattern SUBSTITUTIONS_PATTERN = Pattern.compile("\\$\\d");
    @Getter
    private final Pattern pattern;
    private final String deviceReplacement;
    private final String brandReplacement;
    private final String modelReplacement;

    public UaDevicePattern(final Pattern pattern, final String deviceReplacement, final String brandReplacement, final String modelReplacement) {
        this.pattern = pattern;
        this.deviceReplacement = deviceReplacement;
        this.brandReplacement = brandReplacement;
        this.modelReplacement = modelReplacement;
    }

    public UaDevice match(final String agentString) {
        Matcher matcher = pattern.matcher(agentString);
        if (!matcher.find()) {
            return null;
        }
        String device = "Other";
        String brand = null;
        String model = null;
        if (deviceReplacement != null) {
            device = getRegReplacement(matcher, deviceReplacement);
        }

        if (brandReplacement != null) {
            brand = getRegReplacement(matcher, brandReplacement);
        }

        if (modelReplacement != null) {
            model = getRegReplacement(matcher, modelReplacement);
        }

        return new UaDevice(device, brand, model);
    }

    private String getRegReplacement(final Matcher matcher, final String replacementInput) {
        log.debug("getRegReplacement::replacementInput: {}", replacementInput);
        String replacement = replacementInput;
        if (replacementInput.contains("$")) {
            replacement = replacementInput;
            for (String substitution : getSubstitutions(replacementInput)) {
                int i = Integer.parseInt(substitution.substring(1));
                String groupValue = matcher.groupCount() >= i && matcher.group(i) != null
                        ? Matcher.quoteReplacement(matcher.group(i)) : "";
                replacement = replacement.replaceFirst("\\" + substitution, groupValue);
            }
            replacement = replacement.trim();
        }
        log.debug("getRegReplacement::replacement: {}", replacement);
        return replacement;
    }

    private List<String> getSubstitutions(final String deviceReplacement) {
        Matcher matcher = SUBSTITUTIONS_PATTERN.matcher(deviceReplacement);
        List<String> substitutions = new ArrayList<>();
        while (matcher.find()) {
            substitutions.add(matcher.group());
        }
        return substitutions;
    }

}
