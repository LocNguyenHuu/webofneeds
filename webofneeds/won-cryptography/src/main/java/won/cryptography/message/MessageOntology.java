package won.cryptography.message;

/**
 * User: ypanchenko
 * Date: 04.08.2014
 */
public class MessageOntology
{

  // TODO check with existing code how they do it, do they have ontology objects and
  // access the vocabulary from there? If yes, change to that all the enum classes

  public static final String MESSAGE_ONTOLOGY_URI = "http://purl.org/webofneeds/message#";
  public static final String DEFAULT_PREFIX = "wonmsg";

  public static final String PROTOCOL_PROPERTY = "hasProtocol";
  public static final String METHOD_PROPERTY = "hasMethod";
  public static final String PARAM_NAME_PROPERTY = "parameterName";
  public static final String PARAM_VALUE_PROPERTY = "parameterValue";


  public static final String METHOD_CREATE_NEED = "http://purl.org/webofneeds/message#CreateNeed";
  //public static final String  METHOD_NEED_CREATED = "http://purl.org/webofneeds/message#NeedCreated";
  public static final String METHOD_NEED_CREATED = "http://purl.org/webofneeds/message#Success";
  //public static final String METHOD_NEED_CREATE_DENIED = "http://purl.org/webofneeds/message#CreateDenied";
  public static final String METHOD_ERROR = "http://purl.org/webofneeds/message#Error";

  public static final String METHOD_PARAM_NEED_URI = "http://purl.org/webofneeds/message#NeedUri";
  public static final String METHOD_PARAM_TEXT_MSG = "http://purl.org/webofneeds/message#TextMessage";
  public static final String METHOD_PARAM_RESPONSE_TO_METHOD = "http://purl.org/webofneeds/message#ResponseToMethod";

  public static final String PROTOCOL_OSNPC = "http://purl.org/webofneeds/message#OSNPC";
}
