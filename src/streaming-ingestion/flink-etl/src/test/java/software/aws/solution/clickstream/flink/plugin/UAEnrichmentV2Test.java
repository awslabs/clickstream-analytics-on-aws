package software.aws.solution.clickstream.flink.plugin;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import software.aws.solution.clickstream.common.model.ClickstreamEvent;
import software.aws.solution.clickstream.flink.BaseFlinkTest;
import software.aws.solution.clickstream.plugin.enrich.UAEnrichmentV2;

import static org.mockito.Mockito.*;

public class UAEnrichmentV2Test extends BaseFlinkTest {

    @Mock
    private ClickstreamEvent event;

    private UAEnrichmentV2 uaEnrichment;

    @BeforeEach
    public void setup() {
        MockitoAnnotations.openMocks(this);
        uaEnrichment = new UAEnrichmentV2();
    }

    @Test
    public void enrichesEventWhenUaIsNotInCache() {
        when(event.getUa()).thenReturn("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3");
        uaEnrichment.enrich(event);
        event.getDeviceUa();
        verify(event).setDeviceUa(anyMap());
    }

    @Test
    public void doesNotEnrichEventWhenUaIsNull() {
        when(event.getUa()).thenReturn(null);

        uaEnrichment.enrich(event);

        verify(event, never()).setDeviceUa(anyMap());
        verify(event, never()).setDeviceUaBrowser(anyString());
        verify(event, never()).setDeviceUaOs(anyString());
        verify(event, never()).setDeviceUaBrowserVersion(anyString());
        verify(event, never()).setDeviceUaDevice(anyString());
        verify(event, never()).setDeviceUaDeviceCategory(anyString());
        verify(event, never()).setDeviceUaOsVersion(anyString());
    }

    @Test
    public void doesNotEnrichEventWhenUaIsEmpty() {
        when(event.getUa()).thenReturn("");

        uaEnrichment.enrich(event);

        verify(event, never()).setDeviceUa(anyMap());
        verify(event, never()).setDeviceUaBrowser(anyString());
        verify(event, never()).setDeviceUaOs(anyString());
        verify(event, never()).setDeviceUaBrowserVersion(anyString());
        verify(event, never()).setDeviceUaDevice(anyString());
        verify(event, never()).setDeviceUaDeviceCategory(anyString());
        verify(event, never()).setDeviceUaOsVersion(anyString());
    }
}
