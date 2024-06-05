# AsyncAPI Examples

## Operations Object
<!-- asyncapi-example-tester:{test:'Operations Object',json_path:'$.channels.exampleChannel.subscribe'} -->

Here is an example of an operations object:

```json
{
  "subscribe": {
    "summary": "Example subscription",
    "operationId": "exampleSubscription",
    "message": {
      "$ref": "#/components/messages/exampleMessage"
    }
  }
}
```