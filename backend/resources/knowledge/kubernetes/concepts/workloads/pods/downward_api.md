# Downward API

It is sometimes useful for a container to have information about itself, without being overly coupled to Kubernetes. The downward API allows containers to consume information about themselves or the cluster without using the Kubernetes client or API server.

An example is an existing application that assumes a particular well-known environment variable holds a unique identifier. One possibility is to wrap the application, but that is tedious and error-prone, and it violates the goal of low coupling. A better option would be to use the Pod's name as an identifier, and inject the Pod's name into the well-known environment variable.

In Kubernetes, there are two ways to expose Pod and container fields to a running container:
- as environment variables.
- as files in a `downwardAPI` volume.

Together, these two ways of exposing Pod and container fields are called the downward API.

## Available fields

Only some Kubernetes API fields are available through the downward API. This section lists which fields you can make available.

You can pass information from available Pod-level fields using `fieldRef`. At the API level, the `spec` for a Pod always defines at least one Container. You can pass information from available Container-level fields using `resourceFieldRef`.

### Information available via `fieldRef` {#downwardapi-fieldRef}

For some Pod-level fields, you can provide them to a container either as an environment variable or using a `downwardAPI` volume. The fields available via either mechanism are:

`metadata.name`: the pod's name.

`metadata.namespace`: the pod's namespace.

`metadata.uid`: the pod's unique ID.

`metadata.annotations['<KEY>']`: the value of the pod's annotation named `<KEY>` (for example, `metadata.annotations['myannotation']`).

`metadata.labels['<KEY>']`: the text value of the pod's label named `<KEY>` (for example, `metadata.labels['mylabel']`).

The following information is available through environment variables but not as a downwardAPI volume fieldRef:

`spec.serviceAccountName`: the name of the pod's service account.

`spec.nodeName`: the name of the node where the Pod is executing.

`status.hostIP`: the primary IP address of the node to which the Pod is assigned.

`status.hostIPs`: the IP addresses is a dual-stack version of `status.hostIP`, the first is always the same as `status.hostIP`.

`status.podIP`: the pod's primary IP address (usually, its IPv4 address).

`status.podIPs`: the IP addresses is a dual-stack version of `status.podIP`, the first is always the same as `status.podIP`.

The following information is available through a `downwardAPI` volume `fieldRef`, but not as environment variables:

`metadata.labels`: all of the pod's labels, formatted as `label-key="escaped-label-value"` with one label per line.

`metadata.annotations`: all of the pod's annotations, formatted as `annotation-key="escaped-annotation-value"` with one annotation per line  

### Information available via `resourceFieldRef` {#downwardapi-resourceFieldRef}

These container-level fields allow you to provide information about requests and limits for resources such as CPU and memory.

`resource: limits.cpu`: A container's CPU limit.

`resource: requests.cpu`: A container's CPU request.

`resource: limits.memory`: A container's memory limit.

`resource: requests.memory`: A container's memory request.

`resource: limits.hugepages-*`: A container's hugepages limit.

`resource: requests.hugepages-*`: A container's hugepages request.

`resource: limits.ephemeral-storage`: A container's ephemeral-storage limit.

`resource: requests.ephemeral-storage`: A container's ephemeral-storage request.

#### Fallback information for resource limits

If CPU and memory limits are not specified for a container, and you use the downward API to try to expose that information, then the kubelet defaults to exposing the maximum allocatable value for CPU and memory based on the node allocatable calculation.