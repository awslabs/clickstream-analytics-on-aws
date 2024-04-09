package software.aws.solution.clickstream.common;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.io.Serializable;

@Getter
@Setter
@ToString
public class RuleConfig implements Serializable {
    private static final long serialVersionUID = 1L;
    private String optChannelRuleJson;
    private String optCategoryRuleJson;
}

